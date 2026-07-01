import { Router } from "express";
import express, {Request, Response} from "express";

const groupRoute= Router();

groupRoute.use(express.json());

groupRoute.get("/", (req: Request, res: Response) => {
  const groups = [
    {
      id: "goa",
      name: "Goa Trip",
      members: ["Alice","Bob"],
      icon: "👥",
      balance: 50000,
    },
    {
      id: "cafe",
      name: "Weekend Cafe",
      members: ["Riya", "Shreya", "BehanKiLodi"],
      icon: "☕",
      balance: 320,
    },
  ];

  res.json(groups);
});


export default groupRoute;