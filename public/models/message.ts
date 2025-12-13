export interface Message {
    id: string;
    room_id: string;
    user_id: string;
    avatar: string;
    text: string;
    created_at: string;
}

export interface ServerEvent {
    type: "message";
    data: Message;
    ts: string;
}

export interface ClientSelectRoom {
    type: "select_room";
    payload: { room_id: string };
}

export interface ClientSendMessage {
    type: "send_message";
    payload: { text: string };
}