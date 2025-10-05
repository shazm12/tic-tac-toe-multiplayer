package main

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/heroiclabs/nakama-common/runtime"
)

type DeviceAuthRequest struct {
	Fingerprint DeviceFingerprint `json:"fingerprint"`
	Username    string            `json:"username"`
}

func RpcGenerateDeviceAuth(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	var request DeviceAuthRequest

	if err := json.Unmarshal([]byte(payload), &request); err != nil {
		return "", runtime.NewError("invalid device fingerprint", 3)
	}

	if request.Fingerprint.DeviceID == "" || len(request.Fingerprint.DeviceID) < 10 {
		return "", runtime.NewError("invalid device ID", 3)
	}

	if request.Username == "" {
		request.Username = "Player" + request.Fingerprint.DeviceID[:8]
	}

	jwt, err := GenerateJWT(request.Fingerprint)
	if err != nil {
		return "", runtime.NewError("failed to generate JWT", 13)
	}

	response := map[string]string{
		"jwt":      jwt,
		"username": request.Username,
	}

	responseJSON, _ := json.Marshal(response)
	return string(responseJSON), nil
}
