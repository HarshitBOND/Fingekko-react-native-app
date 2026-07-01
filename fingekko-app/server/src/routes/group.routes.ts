import { Router } from "express";
import express, {Request, Response} from "express";

const groupRoute= Router();

groupRoute.use(express.json());

groupRoute.get("/", (req: Request, res: Response) => {
  const groups = [
    {
      id: "goa",
      name: "Goa Trip",
      members: "4 members",
      icon: "👥",
      amountLabel: "You are owed",
      amount: "₹12250",
      amountColor: "#148a46",
    },
    {
      id: "cafe",
      name: "Weekend Cafe",
      members: "3 members",
      icon: "☕",
      amountLabel: "You owe",
      amount: "₹320",
      amountColor: "#eb5a4f",
    },
  ];

  res.json(groups);
});


export default groupRoute;