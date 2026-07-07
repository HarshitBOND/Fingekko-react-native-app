
import { Request, Response, Router } from "express";
import groupRepository from "../repositories/groupRepository.js";
import authMiddleware from "../middleware/auth.js";
import User from "../models/User.js";
import { computeGroupBalances } from "../services/communityExpenseService.js";

const groupRoute = Router();
groupRoute.use(authMiddleware);

function resolveGroupId(groupId: string | string[] | undefined) {
  return Array.isArray(groupId) ? groupId[0] : groupId;
}

groupRoute.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.clerkId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const groups = await groupRepository.getGroupsByUser(userId);
    const currentUser = await User.findOne({ clerkId: userId }).select("_id");
    const currentUserDbId = currentUser?._id?.toString();

    const response = await Promise.all(
      groups.map(async (group) => {
        let netBalance = 0;
        if (currentUserDbId) {
          const { balances } = await computeGroupBalances(group._id.toString());
          netBalance = balances.find((b) => b.userId === currentUserDbId)?.netBalance ?? 0;
        }

        const amountLabel = netBalance > 0.01 ? "You are owed" : netBalance < -0.01 ? "You owe" : "You are settled up";
        const amountColor = netBalance > 0.01 ? "#148a46" : netBalance < -0.01 ? "#eb5a4f" : "#6b7280";

        return {
          id: group._id.toString(),
          name: group.name,
          members: group.members.map((m) => m.toString()),
          createdBy: group.createdBy.toString(),
          icon: group.icon,
          amountLabel,
          amount: `₹${Math.abs(netBalance).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
          amountColor,
        };
      })
    );

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
    const rawMembers = req.body.members ?? [];

    const members = Array.from(
      new Set([...rawMembers, userId])
    ).filter((m) => typeof m === "string" && m.trim() !== "");

    const data = {
      name: req.body.name,
      description: req.body.description || "",
      createdBy: userId,
      members,
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

    if (!group.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const users = await User.find({
      clerkId: { $in: group.members },
    }).select("clerkId name email");

    const members = group.members.map((clerkId) => {
      const user = users.find((u) => u.clerkId === clerkId);

      return {
        id: clerkId,
        dbId: user?._id.toString() ?? "",
        name: user?.name ?? "Unknown",
        email: user?.email ?? "",
      };
    });

    res.json({
      id: group._id.toString(),
      name: group.name,
      description: group.description,
      members,
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

groupRoute.get("/:groupId/balances", async (req: Request, res: Response) => {
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

    if (!group.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { balances, settlements, totalSpent, expenseCount } = await computeGroupBalances(groupId);

    // Fetch all user details to map MongoDB ObjectId to ClerkId and Name
    const uniqueUserIds = new Set<string>();
    balances.forEach(b => uniqueUserIds.add(b.userId));
    settlements.forEach(s => {
      uniqueUserIds.add(s.fromUserId);
      uniqueUserIds.add(s.toUserId);
    });

    const users = await User.find({
      _id: { $in: Array.from(uniqueUserIds) }
    }).select("_id clerkId name email");

    const userMap = new Map<string, typeof users[0]>();
    users.forEach(u => {
      userMap.set(u._id.toString(), u);
    });

    const mappedBalances = balances.map(b => {
      const u = userMap.get(b.userId);
      return {
        userId: u?.clerkId ?? b.userId,
        name: u?.name ?? "Unknown",
        email: u?.email ?? "",
        netBalance: b.netBalance
      };
    });

    const mappedSettlements = settlements.map(s => {
      const fromUser = userMap.get(s.fromUserId);
      const toUser = userMap.get(s.toUserId);
      return {
        fromUser: {
          id: fromUser?.clerkId ?? s.fromUserId,
          name: fromUser?.name ?? "Unknown",
          email: fromUser?.email ?? ""
        },
        toUser: {
          id: toUser?.clerkId ?? s.toUserId,
          name: toUser?.name ?? "Unknown",
          email: toUser?.email ?? ""
        },
        amount: s.amount
      };
    });

    res.json({
      balances: mappedBalances,
      settlements: mappedSettlements,
      totalSpent,
      expenseCount
    });
  } catch (error) {
    console.error("Error fetching group balances:", error);
    res.status(500).json({ message: "Failed to fetch group balances" });
  }
});


export default groupRoute;