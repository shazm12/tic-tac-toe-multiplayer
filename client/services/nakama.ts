import { Client, Session, Socket } from "@heroiclabs/nakama-js";
import { MatchActionPayload, MatchActionResponse, MoveData, MatchData } from "../interfaces/interfaces";
import { TextDecoder } from 'text-encoding';
// Nakama configuration
const NAKAMA_SERVER_KEY = "defaultkey";
const NAKAMA_HOST = "localhost";
const NAKAMA_PORT = "7350";
const USE_SSL = false;

class NakamaService {
    private client: Client | null = null;
    private session: Session | null = null;
    private socket: Socket | null = null;


    initialize(): void {
        this.client = new Client(
            NAKAMA_SERVER_KEY,
            NAKAMA_HOST,
            NAKAMA_PORT,
            USE_SSL
        );
        console.log("Nakama client initialized");
    }

    async authenticate(username: string): Promise<Session> {
        if (!this.client) {
            throw new Error("Client not initialized. Call initialize() first.");
        }

        try {
            const deviceId = "test-device-" + Math.random().toString(36).substring(7);
            this.session = await this.client.authenticateDevice(deviceId, true, username);
            return this.session;
        } catch (error) {
            console.error("Authentication failed:", error);
            throw error;
        }
    }


    async connectSocket(): Promise<Socket> {
        if (!this.client) {
            throw new Error("Client not initialized");
        }

        if (!this.session) {
            throw new Error("Must authenticate before connecting socket");
        }

        try {
            this.socket = this.client.createSocket(USE_SSL, false);
            await this.socket.connect(this.session, true);
            console.log("WebSocket connected!");

            // Setup event listeners
            this.setupSocketListeners();

            return this.socket;
        } catch (error) {
            console.error("Socket connection failed:", error);
            throw error;
        }
    }

    // Setup WebSocket event listeners
    private setupSocketListeners(): void {
        if (!this.socket) return;

        this.socket.ondisconnect = () => {
            console.log("Socket disconnected");
        };

        this.socket.onerror = (error: any) => {
            console.error("Socket error:", error);
        };

        this.socket.onnotification = (notification: any) => {
            console.log("Notification:", notification);
        };
    }

    // Call RPC function: match_action
    async findOrCreateMatch(
        gameMode: "standard" | "blitz" = "standard",
        action: "join_random" | "create_new" = "join_random"
    ): Promise<MatchActionResponse> {
        if (!this.client || !this.session) {
            throw new Error("Client not initialized or not authenticated");
        }

        try {
            const payload: MatchActionPayload = {
                action,
                game_mode: gameMode,
            };

            const response = await this.client.rpc(
                this.session,
                "match_action",
                payload
            );

            const result: MatchActionResponse = response.payload as MatchActionResponse;
            console.log("Match action result:", result);

            return result;
        } catch (error) {
            console.error("RPC call failed:", error);
            throw error;
        }
    }

    // Join a match via WebSocket
    async joinMatch(matchId: string): Promise<any> {
        if (!this.socket) {
            throw new Error("Socket not connected");
        }

        try {
            const match = await this.socket.joinMatch(matchId);
            this.socket.onmatchdata = (matchData: MatchData) => {
                const data = JSON.parse(new TextDecoder().decode(matchData.data));
            };

            return match;
        } catch (error) {
            console.error("Failed to join match:", error);
            throw error;
        }
    }

    // Set custom match data handler
    setMatchDataHandler(handler: (opCode: number, data: any) => void): void {
        if (!this.socket) {
            throw new Error("Socket not connected");
        }

        this.socket.onmatchdata = (matchData: MatchData) => {
            const data = JSON.parse(new TextDecoder().decode(matchData.data));
            handler(matchData.op_code, data);
        };
    }

    async sendMove(matchId: string, row: number, col: number): Promise<void> {
        if (!this.socket) {
            throw new Error("Socket not connected");
        }

        try {
            const moveData: MoveData = {
                row,
                col,
            };

            await this.socket.sendMatchState(
                matchId,
                1, // OpCode for move
                JSON.stringify(moveData)
            );
        } catch (error) {
            console.error("Failed to send move:", error);
            throw error;
        }
    }

    // Leave match
    async leaveMatch(matchId: string): Promise<void> {
        if (!this.socket) {
            throw new Error("Socket not connected");
        }

        try {
            await this.socket.leaveMatch(matchId);
            console.log("Left match");
        } catch (error) {
            console.error("Failed to leave match:", error);
            throw error;
        }
    }


    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect(true);
            this.socket = null;
        }
    }

    getClient(): Client | null {
        return this.client;
    }

    getSession(): Session | null {
        return this.session;
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    isConnected(): boolean {
        return this.socket !== null;
    }
}


export default new NakamaService();