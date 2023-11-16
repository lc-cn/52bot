import {Contactable} from "@/entries/contactable";
import {User} from "@/entries/user";
import {Bot} from "@";

const memberCache: WeakMap<GroupMember.Info, GroupMember> = new WeakMap<GroupMember.Info, GroupMember>()
export class GroupMember extends Contactable {
    group_id: string
    constructor(bot:Bot,public info:GroupMember.Info){
        super(bot);
        this.group_id=info.group_id
        this.user_id=info.user.id
    }
    static from(this:Bot,group_id:string,member_id:string){
        const groupMemberMap = this.groupMembers.get(group_id)
        if (!groupMemberMap) throw new Error(`未找到关于group(${group_id})的成员。`)
        const memberInfo = groupMemberMap.get(member_id)
        if (!memberInfo) throw new Error(`group(${group_id}) member(${member_id}) is not exist`)
        if (memberCache.has(memberInfo)) return memberCache.get(memberInfo)
        const member = new GroupMember(this, memberInfo)
        memberCache.set(memberInfo, member)
        return member
    }
}
export namespace GroupMember {
    export interface Info {
        user: User.Info
        group_id:string
    }
}
