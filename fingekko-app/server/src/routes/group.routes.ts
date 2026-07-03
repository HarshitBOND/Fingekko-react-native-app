
import { Request, Response, Router } from "express";
import groupRepository from "../repositories/groupRepository.js";
import authMiddleware from "../middleware/auth.js";

const groupRoute = Router();
groupRoute.use(authMiddleware);

function resolveGroupId(groupId: string | string[] | undefined) {
  return Array.isArray(groupId) ? groupId[0] : groupId;
}

groupRoute.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.clerkId;
    console.log(req.auth);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const groups = await groupRepository.getGroupsByUser(userId);

    const response = groups.map((group) => ({
      id: group._id.toString(),
      name: group.name,
      members: group.members.map((m) => m.toString()),
      createdBy: group.createdBy.toString(),
      icon: group.icon,
      balance: 0,
    }));

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
});

groupRoute.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.clerkId;

    if (!userId) {
      return res.status(500).json({ message: "unauthorized" })
    }
    const data = {
      name: req.body.name,
      description: req.body.description || "",
      createdBy: userId,
      members: [...(req.body.members ?? []), userId],
      icon: req.body.icon || "Coins",
    }
    const group = await groupRepository.createGroup(data);

    res.status(201).json(group);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "failed to create group" });
  }
})

groupRoute.get("/:groupId", async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.clerkId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const groupId = resolveGroupId(req.params.groupId);

    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const group = await groupRepository.find(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some((m) => m.toString() === userId)){
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json({
      id: group._id.toString(),
      name: group.name,
      description: group.description,
      members: group.members.map((m) => m.toString()),
      createdBy: group.createdBy.toString(),
      icon: group.icon,
      balance: 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch group details" });
  }
});

groupRoute.delete("/:groupId", async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.clerkId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const groupId = resolveGroupId(req.params.groupId);

    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const group = await groupRepository.find(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.createdBy.toString() !== userId) {
      return res.status(403).json({ message: "Only the creator can delete this group" });
    }

    await groupRepository.deleteGroup(groupId);

    return res.json({ message: "Group deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete group" });
  }
});

groupRoute.post("/:groupId/leave", async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.clerkId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const groupId = resolveGroupId(req.params.groupId);

    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const group = await groupRepository.find(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.createdBy.toString() === userId) {
      return res.status(400).json({ message: "Creator cannot leave the group" });
    }

    if (!group.members.some((member) => member.toString() === userId)) {
      return res.status(400).json({ message: "You are not part of this group" });
    }

    const updatedMembers = group.members.filter((member) => member.toString() !== userId);
    await groupRepository.updateGroup(groupId, { members: updatedMembers });

    return res.json({ message: "Left group" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to leave group" });
  }
});


export default groupRoute;