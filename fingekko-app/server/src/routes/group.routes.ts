import { Router } from "express";
import express, {Request, Response} from "express";

const app= express();
const groupRoute= Router();

app.use(express.json());

app.get("/",(req: Request ,res: Response)=>{
    res.send("Hello backend is running");
})

app.get("/api/groups", (req: Request, res: Response) => {
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