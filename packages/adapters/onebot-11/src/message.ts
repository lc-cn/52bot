import { Dict, unwrap } from '52bot';
import { OneBotV11 } from '@/onebot';

export class MessageV11 {
  raw_message: string = '';
  user_id: number = 0;
  group_id: number = 0;
  message_type: 'group' | 'private' = 'private';
  message: string | (MessageV11.Segment | string)[] = [];

  constructor(
    public bot: OneBotV11,
    event: Dict,
  ) {
    const { raw_message: _, message } = event;
    Object.assign(this, {
      raw_message: MessageV11.formatToString(message),
      message: message,
      ...event,
    });
  }
}

export class PrivateMessageEventV11 extends MessageV11 implements MessageV11.MessageEventV11 {
  constructor(bot: OneBotV11, event: Dict) {
    super(bot, event);
    this.user_id = event.user_id;
  }

  async reply(message: MessageV11.Sendable) {
    message=await this.bot.app!.renderMessage(message as string,this)
    message = MessageV11.formatSegments(message);
    if (typeof this.message === 'string') message = MessageV11.segmentsToCqCode(message as MessageV11.Segment[]);
    return this.bot.sendPrivateMsg(this.user_id!, message);
  }
}

export class GroupMessageEventV11 extends MessageV11 implements MessageV11.MessageEventV11 {
  constructor(bot: OneBotV11, event: Dict) {
    super(bot, event);
    this.user_id = event.user_id;
    this.group_id = event.group_id;
  }

  async reply(message: MessageV11.Sendable) {
    message=await this.bot.app!.renderMessage(message as string,this)
    message = MessageV11.formatSegments(message);
    if (typeof this.message === 'string') message = MessageV11.segmentsToCqCode(message as MessageV11.Segment[]);
    return this.bot.sendGroupMsg(this.group_id!, message);
  }
}

export namespace MessageV11 {
  export type Segment = {
    type: string;
    data: Dict;
  };
  export type Ret = {
    message_id: number;
  };
  export type Sendable = string | Segment | (string | Segment)[];
  export type MessageEventV11 = {
    reply(message: Sendable): Promise<Ret>;
  };

  export function segmentsToCqCode(segments: Segment[]) {
    let result = '';
    for (const item of segments) {
      const { type, data } = item;
      if (type === 'text') result += data.text || '';
      else
        result += `[CQ:${type},${Object.entries(data)
          .map(([key, value]) => `${key}=${value}`)
          .join(',')}]`;
    }
    return result;
  }

  export function parseSegmentsFromTemplate(template: string): Segment[] {
    const result: Segment[] = [];
    const reg = /(<[!>]+>)/;
    while (template.length) {
      const [match] = template.match(reg) || [];
      if (!match) break;
      const index = template.indexOf(match);
      const prevText = template.slice(0, index);
      if (prevText) result.push({ type: 'text', data: { text: prevText } });
      template = template.slice(index + match.length);
      const [type, ...attrs] = match.slice(1, -1).split(',');
      const data = Object.fromEntries(
        attrs.map(attrStr => {
          const [key, ...valueArr] = attrStr.split('=');
          return [key, JSON.parse(unwrap(valueArr.join('=')))];
        }),
      );
      result.push({ type, data });
    }
    if (template.length) result.push({ type: 'text', data: { text: template } });
    return result;
  }

  export function parseSegmentsFromCqCode(template: string): Segment[] {
    const result: Segment[] = [];
    const reg = /(\[CQ:[!\]]+])/;
    while (template.length) {
      const [match] = template.match(reg) || [];
      if (!match) break;
      const index = template.indexOf(match);
      const prevText = template.slice(0, index);
      if (prevText) result.push({ type: 'text', data: { text: prevText } });
      template = template.slice(index + match.length);
      const [typeWithPrefix, ...attrs] = match.slice(1, -1).split(',');
      const type = typeWithPrefix.replace('CQ:', '');
      const data = Object.fromEntries(
        attrs.map(attrStr => {
          const [key, ...valueArr] = attrStr.split('=');
          return [key, valueArr.join('=')];
        }),
      );
      result.push({
        type,
        data,
      });
    }
    if (template.length) {
      result.push({
        type: 'text',
        data: {
          text: template,
        },
      });
    }
    return result;
  }

  export function formatSegments(message: Sendable): Segment[] {
    const result: Segment[] = [];
    if (!Array.isArray(message)) message = [message];
    for (const item of message) {
      if (typeof item === 'string') result.push(...parseSegmentsFromTemplate(item));
      else result.push(item);
    }
    return result;
  }

  export function formatToString(message: string | Segment[]) {
    if (typeof message === 'string') return formatToString(parseSegmentsFromCqCode(message));
    let result: string = '';
    for (const item of message) {
      const { type, data } = item;
      if (type === 'text') result += data.text || '';
      else
        result += `<${type},${Object.entries(data)
          .map(([key, value]) => `${key}=${JSON.stringify(value).replace(/,/g, '_🤤_🤖_')}`)
          .join(',')}>`;
    }
    return result;
  }
}
