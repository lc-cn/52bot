import {Contactable} from "@/entries/contactable";
import {Bot} from "@";
import {User} from "@/entries/user";

const friendCache: WeakMap<Friend.Info, Friend> = new WeakMap<Friend.Info, Friend>()
export class Friend extends Contactable{
    constructor(bot:Bot,public info:Friend.Info){
        super(bot);
        this.user_id=info.id
    }
    static from(this:Bot,friend_id:string){
        const friendInfo = this.friends.get(friend_id)
        if (!friendInfo) throw new Error(`friend(${friend_id}) is not exist`)
        if (friendCache.has(friendInfo)) return friendCache.get(friendInfo)
        const friend = new Friend(this, friendInfo)
        friendCache.set(friendInfo, friend)
        return friend
    }
}
export namespace Friend {
    export interface Info {
        id: string
        user:User.Info
        name: string
    }
}
