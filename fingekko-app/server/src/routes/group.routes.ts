import { Router } from "express";
import { Request, Response } from "express";
import groupRepository from "../repositories/groupRepository.js";

const groupRoute = Router();

groupRoute.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const groups = await groupRepository.getGroupsByUser(userId);

    const response = groups.map((group) => ({
      id: group._id.toString(),
      name: group.name,
      members: group.members.map((m) => m.toString()),
      icon: group.name.charAt(0),
      balance: 0,
    }));

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
});

groupRoute.post("/", async(req: Request, res: Response)=>{
  try{

    const data= {
      name: req.body.name,
      description: req.body.description || "",
      createdBy: req.user.id,
      members: [...req.body.members, req.user.id],
    }
    const group = await groupRepository.createGroup(data);

    res.status(201).json(group);
  }catch(error){
    console.log(error);
    res.status(500).json({message:"failed to create group"});
  }
})


export default groupRoute;