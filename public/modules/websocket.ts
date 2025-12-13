import { dispatcher } from "../dispatcher/dispatcher";
import { ACTION_CHAT_TYPES } from "../actions/actionChat";
import { ACTION_MESSAGES_TYPES } from "../actions/actionMessages";
import { Message, ServerEvent, ClientSelectRoom, ClientSendMessage } from "../models/message";

// Используем встроенный WebSocket браузера
export default class WebsocketClient {
    private socket: WebSocket | null = null;
    private url: string;
    private currentRoom: string | null = null;

    constructor(url: string) {
        this.url = url;
        this.connect();

        dispatcher.register(ACTION_CHAT_TYPES.goToChat, ({ id }) => {
            this.selectRoom(id);
        });

        dispatcher.register(ACTION_CHAT_TYPES.sendMessage, ({ message }) => {
            this.send(message.text);
        });
    }

    private connect() {
        // Используем глобальный WebSocket (браузерный API)
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log("WS OPEN");
            if (this.currentRoom) this.selectRoom(this.currentRoom);
        };

        this.socket.onmessage = this.onMessage.bind(this);

        this.socket.onclose = () => {
            console.warn("WS CLOSED — reconnecting...");
            setTimeout(() => this.connect(), 2000);
        };
    }

    selectRoom(id: string) {
        this.currentRoom = id;
        if (this.socket?.readyState === WebSocket.OPEN) {
            const msg: ClientSelectRoom = {
                type: "select_room",
                payload: { room_id: id }
            };
            this.socket.send(JSON.stringify(msg));
        }
    }

    send(text: string) {
        if (!this.currentRoom) return;
        if (this.socket?.readyState === WebSocket.OPEN) {
            const msg: ClientSendMessage = {
                type: "send_message",
                payload: { text }
            };
            this.socket.send(JSON.stringify(msg));
        }
    }

    private onMessage(e: MessageEvent) {
        const ev: ServerEvent = JSON.parse(e.data);
        if (ev.type !== "message") return;
        const message = ev.data;
        if (message.room_id !== this.currentRoom) return;

        dispatcher.dispatch(ACTION_MESSAGES_TYPES.newMessage, {
            message
        });
    }
}