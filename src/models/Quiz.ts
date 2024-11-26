import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["multiple_choice", "true_false", "essay"],
    required: true,
  },
  options: [
    {
      text: String,
      isCorrect: Boolean,
    },
  ],
  correctAnswer: String, // Para questões dissertativas
  points: {
    type: Number,
    default: 1,
  },
});

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    questions: [questionSchema],
    minimumScore: {
      type: Number,
      required: true,
      default: 70, // Porcentagem mínima para aprovação
    },
    timeLimit: {
      type: Number, // Em minutos
      default: 30,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
