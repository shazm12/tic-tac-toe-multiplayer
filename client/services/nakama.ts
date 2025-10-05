import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDeviceFingerprint } from '../utils/deviceAuth';
import { Client, Session, Socket } from "@heroiclabs/nakama-js";
import { MatchActionPayload, MatchActionResponse, MoveData, MatchData, DeviceFingerprint } from "../interfaces/interfaces";
import { TextDecoder } from 'text-encoding';

const NAKAMA_SERVER_KEY = process.env.EXPO_PUBLIC_NAKAMA_KEY!;
const NAKAMA_HOST = process.env.EXPO_PUBLIC_NAKAMA_HOST!;
const NAKAMA_PORT = process.env.EXPO_PUBLIC_NAKAMA_PORT!;
const USE_SSL = false;
const SESSION_KEY = '@nakama_session';

class NakamaService {
    private client: Client | null = null;
    private session: Session | null = null;
    private socket: Socket | null = null;

    initialize(): Client {
        this.client = new Client(
            NAKAMA_SERVER_KEY,
            NAKAMA_HOST,
            NAKAMA_PORT,
            USE_SSL
        );
        return this.client;
    }

    async restoreSession(): Promise<Session | null> {
        if (!this.client) {
            throw new Error("Client not initialized");
        }
    
        try {
            const storedToken = await AsyncStorage.getItem(SESSION_KEY);
            const storedRefreshToken = await AsyncStorage.getItem(SESSION_KEY + '_refresh');
            
            if (storedToken && storedRefreshToken) {
                const restored = Session.restore(storedToken, storedRefreshToken);
                
                if (!restored.isexpired(Date.now() / 1000)) {
                    this.session = restored;
                    return restored;
                }
            }
        } catch (error) {
            await AsyncStorage.removeItem(SESSION_KEY);
            await AsyncStorage.removeItem(SESSION_KEY + '_refresh');
        }
        
        return null;
    }

    async authenticate(username: string): Promise<Session> {
        if (!this.client) {
            throw new Error("Client not initialized");
        }
    
        try {
            const restored = await this.restoreSession();
            
            if (restored) {
                return restored;
            }
    
            const fingerprint: DeviceFingerprint = await generateDeviceFingerprint();
    
            const tempSession = await this.client.authenticateDevice(fingerprint.deviceId, true);
    
            const requestPayload = {
                fingerprint: fingerprint,
                username: username || `Player${Math.floor(Math.random() * 1000)}`
            };
    
            const response = await this.client.rpc(
                tempSession,
                "generate_device_auth",
                requestPayload
            );
    
            const payload = typeof response.payload === 'string'
                ? JSON.parse(response.payload)
                : response.payload;
            
            const { jwt } = payload || {};
    
            this.session = await this.client.authenticateCustom(jwt, true, username);
    
            await AsyncStorage.setItem(SESSION_KEY, this.session.token);
            await AsyncStorage.setItem(SESSION_KEY + '_refresh', this.session.refresh_token);
    
            return this.session;
        } catch (error) {
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

            this.setupSocketListeners();

            return this.socket;
        } catch (error) {
            throw error;
        }
    }

    private setupSocketListeners(): void {
        if (!this.socket) return;

        this.socket.ondisconnect = () => {};

        this.socket.onerror = (error: any) => {};

        this.socket.onnotification = (notification: any) => {};
    }

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

            const result: MatchActionResponse = typeof response.payload === 'string'
                ? JSON.parse(response.payload)
                : response.payload;

            return result;
        } catch (error) {
            throw error;
        }
    }

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
            throw error;
        }
    }

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
                1,
                JSON.stringify(moveData)
            );
        } catch (error) {
            throw error;
        }
    }

    async leaveMatch(matchId: string): Promise<void> {
        if (!this.socket) {
            throw new Error("Socket not connected");
        }

        try {
            await this.socket.leaveMatch(matchId);
        } catch (error) {
            throw error;
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect(true);
            this.socket = null;
        }
    }

    async clearSession(): Promise<void> {
        await AsyncStorage.removeItem(SESSION_KEY);
        this.session = null;
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
