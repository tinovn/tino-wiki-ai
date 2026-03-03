export interface FbMessage {
  mid: string;
  text?: string;
}

export interface FbMessaging {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: FbMessage;
  delivery?: any;
  read?: any;
}

export interface FbEntry {
  id: string; // pageId
  time: number;
  messaging: FbMessaging[];
}

export interface FacebookWebhookDto {
  object: string; // "page"
  entry: FbEntry[];
}
