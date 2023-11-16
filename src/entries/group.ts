import {Contactable} from "@/entries/contactable";
import {Bot} from "@";
import {GroupMember} from "@/entries/groupMember";
const groupCache: WeakMap<Group.Info, Group> = new WeakMap<Group.Info, Group>()
export class Group extends Contactable{
    constructor(bot:Bot,public info:Group.Info){
        super(bot);
        this.group_id=info.id
    }
    pickMember=GroupMember.from.bind(this.bot,this.group_id)
    static from(this:Bot,group_id:string){
        const groupInfo = this.groups.get(group_id)
        if (!groupInfo) throw new Error(`group(${group_id}) is not exist`)
        if (groupCache.has(groupInfo)) return groupCache.get(groupInfo)
        const group = new Group(this,groupInfo)
        groupCache.set(groupInfo,group)
        return group
    }
}
export namespace Group {
    export interface Info {
        id: string
        name: string
    }
}
