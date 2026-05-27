const { mongoose } = require('../db');

const questEntrySchema = new mongoose.Schema(
  {
    questId: { type: Number, required: true },
    status: { type: String, required: true },
    progress: { type: Number, required: true },
  },
  { _id: false }
);

const questStateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    date: { type: String, required: true },
    difficultyByType: { type: Map, of: Number, default: {} },
    quests: { type: [questEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.QuestState || mongoose.model('QuestState', questStateSchema);
