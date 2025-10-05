package main

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type DeviceFingerprint struct {
	DeviceID     string `json:"deviceId"`
	DeviceModel  string `json:"deviceModel"`
	OSVersion    string `json:"osVersion"`
	AppVersion   string `json:"appVersion"`
	Brand        string `json:"brand"`
	Manufacturer string `json:"manufacturer"`
}

type CustomClaims struct {
	Device     DeviceFingerprint `json:"device"`
	AppVersion string            `json:"app_version"`
	jwt.RegisteredClaims
}

func GenerateJWT(fingerprint DeviceFingerprint) (string, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "tictactoe"
	}

	claims := CustomClaims{
		Device:     fingerprint,
		AppVersion: fingerprint.AppVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fingerprint.DeviceID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

func verifyJWT(tokenString string) (*CustomClaims, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "tictactoe"
	}

	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
