import Group from "../models/Group";

interface GroupDTO {
  name: string;
  description: string;
  currency: string;
  createdBy: string;
  members: string[];
  isArchived?: boolean;
}

class GroupRepository {
  async createGroup(groupData: Partial<GroupDTO>) {
    return Group.create(groupData);
  }

  async find(groupId: string) {
    return Group.findById(groupId);
  }

  async updateGroup(groupId: string, updateData: Partial<GroupDTO>) {
    return Group.findByIdAndUpdate(groupId, updateData, { new: true });
  }

  async deleteGroup(groupId: string) {
    return Group.findByIdAndDelete(groupId);
  }

  async getAllGroups() {
    return Group.find();
  }
}

export default new GroupRepository();