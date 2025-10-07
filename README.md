## Tic-Tac-Toe (Nakama + React Native)

A real-time multiplayer Tic-Tac-Toe built with a Go backend powered by Nakama (matchmaking, authoritative match loop, RPCs, leaderboards) and a React Native client (Expo) for a smooth mobile experience.

## Video Link
https://drive.google.com/file/d/1IPjumk-ZKmln0eDCNUbmU4vDCDrg9NKd/view?usp=sharing

### Tech Stack
- **Backend**: Go, Nakama server (authoritative matches, RPC, storage, leaderboards)
- **Client**: React Native (Expo), TypeScript, Tailwind (NativeWind)
- **Networking**: `@heroiclabs/nakama-js` (sessions, sockets, match data)

### Features
- **Realtime multiplayer**: Join or create matches; authoritative game logic prevents cheating
- **Turn timer (Blitz/Standard)**: Per-move countdown with timeout handling
- **Leaderboards**: Score submission and display of top players
- **Device-based auth**: Lightweight JWT flow via backend RPC for user sessions

### Backend (Go + Nakama)
- Implements a `TicTacToeMatch` with an authoritative loop: validates moves, tracks board state, decides winners/draws, and broadcasts state via op codes (game state, game over).
- RPC endpoints (e.g., `generate_device_auth`) issue JWTs and helper actions (e.g., leaderboard id retrieval).
- Uses Nakama modules for matchmaking, WebSocket messages, and leaderboard writes.

### React Native App (Expo)
- Handles auth/session restore, connects a Nakama socket, and manages match lifecycle.
- Renders the board, indicates turn, and shows a timer in active games.
- Displays a results modal with outcome messaging and a leaderboard snapshot.


