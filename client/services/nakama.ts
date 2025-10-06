import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDeviceFingerprint } from '../utils/deviceAuth';
import { Client, LeaderboardRecord, Session, Socket, WriteLeaderboardRecord } from "@heroiclabs/nakama-js";
import { MatchActionPayload, MatchActionResponse, MoveData, MatchData, DeviceFingerprint, DeviceAuthResponse, GameModeType, LeaderboardActionResponse } from "../interfaces/interfaces";
import { TextDecoder } from 'text-encoding';
import Constants from 'expo-constants';

const NAKAMA_SERVER_KEY = process.env.EXPO_PUBLIC_NAKAMA_KEY || "defaultkey";
const NAKAMA_HOST = Constants.expoConfig?.extra?.nakamaServerHost || "localhost";
const NAKAMA_PORT = Constants.expoConfig?.extra?.nakamaServerPort || "7350";
const USE_SSL = true;
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

            const payload: DeviceAuthResponse = response.payload as DeviceAuthResponse;

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

        this.socket.ondisconnect = () => { };

        this.socket.onerror = (error: any) => { };

        this.socket.onnotification = (notification: any) => { };
    }

    async findOrCreateMatch(
        gameMode: GameModeType = "standard",
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

    async getLeaderboardID(): Promise<LeaderboardActionResponse> {
        if (!this.client || !this.session) {
            throw new Error("Client not initialized or not authenticated");
        }
        try {
            const response = await this.client.rpc(this.session,"leaderboard_action", {});
            const result: LeaderboardActionResponse = response.payload as LeaderboardActionResponse;
            return result
        }
        catch(error) {
            throw error;
        }

    }

    async writeLeaderboardScore(leaderboardId: string, score: number, subscore: number = 0): Promise<void> {
        if (!this.client || !this.session) {
            throw new Error("Not authenticated");
        }
    
        try {
            
            const metadata = {
                timestamp: Date.now()
            };
            
            const writeRequest: WriteLeaderboardRecord = {
                metadata: metadata,
                score: score.toString(),
                subscore: subscore.toString(),

            }
    
            await this.client.writeLeaderboardRecord(
                this.session,
                leaderboardId,
                writeRequest
            );
    
            console.log(`Leaderboard updated: ${score} points`);
        } catch (error) {
            console.error("Failed to write leaderboard:", error);
            throw error;
        }
    }

    async getLeaderboard(leaderboardId: string, limit: number = 10): Promise<LeaderboardRecord[]> {
        if (!this.client || !this.session) {
            throw new Error("Not authenticated");
        }
    
        try {
            const result = await this.client.listLeaderboardRecords(
                this.session,
                leaderboardId,
                [],
                limit
            );
            if(result.records) {
                return result.records;
            }
            return [];
            
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
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
