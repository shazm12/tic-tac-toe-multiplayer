FROM heroiclabs/nakama-pluginbuilder:latest AS builder

WORKDIR /backend

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build --trimpath --buildmode=plugin -o backend.so

FROM heroiclabs/nakama:latest

COPY --from=builder /backend/backend.so /nakama/data/modules/

EXPOSE 7349 7350 7351
