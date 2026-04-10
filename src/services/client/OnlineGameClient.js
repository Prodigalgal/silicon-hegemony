/**
 * @file OnlineGameClient.js
 * @description GameClient的在线模式实现，包含详尽的网络活动日志。
 */
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { setConnected, setLobbyState, resetRoom } from '../../store/roomSlice';
import { gameStarted, executeFactionTurn, prepareFactionTurn, simulationSpeedChanged } from '../../store/gameSlice';
import { setUserInfo } from '../../store/userSlice';
import { WEBSOCKET_URL, SERVER_URL } from '../../game/constants';
import { GameClient } from './GameClient.js';
import { showSnackbar } from '../../store/uiSlice';
import { AIServiceController } from '../AIServiceController';

export class OnlineGameClient extends GameClient {
    stompClient = null;
    subscriptions = {};
    connectionPromise = null;
    static instance = null;

    constructor(dispatch, getState) {
        super(dispatch, getState);
        if (OnlineGameClient.instance) {
            return OnlineGameClient.instance;
        }
        OnlineGameClient.instance = this;
    }

    static getInstance(dispatch, getState) {
        if (!OnlineGameClient.instance) {
            OnlineGameClient.instance = new OnlineGameClient(dispatch, getState);
        }
        OnlineGameClient.instance.dispatch = dispatch;
        OnlineGameClient.instance.getState = getState;
        return OnlineGameClient.instance;
    }

    connect() {
        if (this.connectionPromise && this.stompClient?.active) {
            return this.connectionPromise;
        }
        console.log("[日志][OnlineClient] 正在尝试连接到WebSocket服务器...");
        this.connectionPromise = new Promise((resolve, reject) => {
            const socket = new SockJS(WEBSOCKET_URL);
            this.stompClient = Stomp.over(socket);
            this.stompClient.debug = () => {};
            this.stompClient.onConnect = (frame) => {
                const urlParts = this.stompClient.webSocket._transport.url.split('/');
                const sessionId = urlParts[urlParts.length - 2];
                this.dispatch(setUserInfo({ id: sessionId, name: this.getState().user.name }));
                this.dispatch(setConnected(true));
                console.log(`[日志][OnlineClient] WebSocket连接成功。会话ID: ${sessionId}`);
                resolve(frame);
            };
            this.stompClient.onStompError = (frame) => {
                const errorMsg = 'Broker reported error: ' + frame.headers['message'] + ' - ' + frame.body;
                console.error(`[错误][OnlineClient] ${errorMsg}`);
                this.dispatch(setConnected(false));
                this.dispatch(showSnackbar({ message: '与服务器的连接断开', severity: 'error'}));
                this.connectionPromise = null;
                reject(frame);
            };
            this.stompClient.activate();
        });
        return this.connectionPromise;
    }

    disconnect() {
        if (this.stompClient) {
            console.log("[日志][OnlineClient] 正在断开WebSocket连接...");
            this.stompClient.deactivate();
            this.stompClient = null;
            this.connectionPromise = null;
            this.dispatch(resetRoom());
            console.log("[日志][OnlineClient] 连接已断开。");
        }
    }

    async sendMessage(destination, body = {}) {
        await this.connect();
        console.log(`[日志][OnlineClient] -> 发送消息到 ${destination}`, body);
        this.stompClient.publish({ destination, body: JSON.stringify(body) });
    }

    async subscribe(topic, callback) {
        await this.connect();
        if (this.subscriptions[topic]) { this.subscriptions[topic].unsubscribe(); }
        console.log(`[日志][OnlineClient] 正在订阅主题: ${topic}`);
        this.subscriptions[topic] = this.stompClient.subscribe(topic, (message) => {
            const parsedBody = JSON.parse(message.body);
            console.log(`[日志][OnlineClient] <- 从 ${topic} 收到消息`, parsedBody);
            callback(parsedBody);
        });
    }

    async createRoom(roomName, isPublic, maxPlayers) {
        await this.connect();
        const me = this.getState().user;
        const response = await fetch(`${SERVER_URL}/api/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: roomName, isPublic, maxPlayers, hostPlayerId: me.id, hostPlayerName: me.name })
        });
        if (response.ok) {
            const room = await response.json();
            console.log(`[日志][OnlineClient] 房间 ${room.roomId} 创建成功，即将加入。`);
            await this.joinRoom(room.roomId);
        } else {
            const errorText = await response.text();
            console.error(`[错误][OnlineClient] 创建房间API调用失败: ${errorText}`);
            throw new Error('创建房间失败');
        }
    }

    async joinRoom(roomId) {
        await this.connect();
        Object.values(this.subscriptions).forEach(sub => sub.unsubscribe());
        this.subscriptions = {};

        console.log(`[日志][OnlineClient] 准备加入房间 ${roomId} 并设置所有订阅。`);
        this.subscribe(`/topic/rooms/${roomId}/lobby`, (lobbyState) => this.dispatch(setLobbyState({ ...lobbyState, roomId })));
        this.subscribe(`/topic/rooms/${roomId}/game-started`, (payload) => this.dispatch(gameStarted(payload)));
        this.subscribe(`/topic/rooms/${roomId}/prepare-turn`, (payload) => this.dispatch(prepareFactionTurn(payload)));
        this.subscribe(`/topic/rooms/${roomId}/execute-turn`, (payload) => this.dispatch(executeFactionTurn({ isOnline: true, payload })));
        this.subscribe(`/topic/rooms/${roomId}/speed-changed`, (payload) => this.dispatch(simulationSpeedChanged(payload.speed)));

        this.sendMessage(`/app/rooms/${roomId}/join`, { playerName: this.getState().user.name });
    }

    setAiConfigurations(configs) {
        console.log(`[日志][OnlineClient] 正在为房间 ${this.getState().room.roomId} 设置所有AI配置。`);
        AIServiceController.setAiConfigurations(configs);
        this.sendMessage(`/app/rooms/${this.getState().room.roomId}/config-all`, { factionsConfig: configs });
    }

    claimFaction(factionId) { this.sendMessage(`/app/rooms/${this.getState().room.roomId}/claim`, { factionId }); }
    sendFactionConfig(factionId, config) { this.sendMessage(`/app/rooms/${this.getState().room.roomId}/config`, { factionId, config }); }
    setReady(isReady) { this.sendMessage(`/app/rooms/${this.getState().room.roomId}/ready`, { isReady }); }
    setPlayerStatus(status) { this.sendMessage(`/app/rooms/${this.getState().room.roomId}/player-status`, { status }); }

    startGame() {
        this.sendMessage(`/app/rooms/${this.getState().room.roomId}/start`);
    }

    resetGame() {
        this.sendMessage(`/app/rooms/${this.getState().room.roomId}/reset`);
    }

    setSimulationSpeed(speed) {
        this.sendMessage(`/app/rooms/${this.getState().room.roomId}/speed`, { speed });
    }

    async processNextTurn(factionId, gameState) {
        const state = this.getState();
        const { room, user } = state;
        const isHost = user.id === room.hostPlayerId;

        if (!isHost || gameState.gameStatus !== 'awaiting_ai_input' || gameState.activeFactionId !== factionId) {
            return;
        }

        const faction = gameState.factions[factionId];
        const factionAiConfig = room.factionsConfig[factionId];

        if (faction && !faction.isHuman && factionAiConfig) {
            console.log(`[日志][OnlineClient] 作为主机，正在为AI ${faction.name} 生成决策...`);
            const aiPlan = await AIServiceController.generateTurn(factionId, gameState);
            if(aiPlan) {
                this.sendMessage(`/app/rooms/${room.roomId}/broadcast-execute-turn`, { ...aiPlan, factionId });
            }
        }
    }

    completeTurn(_factionId) {
        // 在线模式下，由服务器通过'prepare-turn'事件来驱动回合结束和下一回合开始。
        console.log(`[日志][OnlineClient] completeTurn 被调用，但在在线模式下不执行任何操作。等待服务器指令。`);
    }
}
