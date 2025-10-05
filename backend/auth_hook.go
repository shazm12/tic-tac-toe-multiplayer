package main

import (
	"context"
	"database/sql"

	"github.com/heroiclabs/nakama-common/api"
	"github.com/heroiclabs/nakama-common/runtime"
)

func BeforeAuthenticateCustom(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, in *api.AuthenticateCustomRequest) (*api.AuthenticateCustomRequest, error) {
	claims, err := verifyJWT(in.Account.Id)
	if err != nil {
		logger.Error("JWT verification failed: %v", err)
		return nil, runtime.NewError("invalid authentication token", 13)
	}

	if claims.Device.DeviceID == "" {
		logger.Error("Missing device ID in JWT")
		return nil, runtime.NewError("invalid device information", 3)
	}

	if len(claims.Device.DeviceID) < 10 {
		logger.Error("Device ID too short")
		return nil, runtime.NewError("invalid device ID", 3)
	}

	logger.Info("User authenticated: %s (Device: %s %s)",
		claims.Subject,
		claims.Device.Brand,
		claims.Device.DeviceModel)

	in.Account.Id = claims.Subject

	if in.Username == "" {
		in.Username = "Player" + claims.Subject[:8]
	}

	return in, nil
}
