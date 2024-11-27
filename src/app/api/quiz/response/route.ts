import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import QuizResponse from "@/models/QuizResponse";
import Quiz from "@/models/Quiz";
import User from "@/models/User";
import { getSession } from "@/lib/auth/auth";

export async function GET(request: Request) {
  try {
    await connectDB();

    // Verifica se é admin
    const session = await getSession();
    if (!session?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const user = await User.findById(session.id);
    if (!user || user.role !== "admin") {
      return new NextResponse("Acesso negado", { status: 403 });
    }

    // Verifica se há filtro por curso
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    // Constrói a query base
    let query = {};

    if (courseId) {
      const quizzes = await Quiz.find({ course: courseId });
      const quizIds = quizzes.map((quiz) => quiz._id);
      query = { quiz: { $in: quizIds } };
    }

    // Busca respostas
    const responses = await QuizResponse.find(query)
      .populate("user", "name email")
      .populate({
        path: "quiz",
        populate: {
          path: "course",
          select: "title",
        },
      })
      .sort({ completedAt: -1 });

    return NextResponse.json(responses);
  } catch (error) {
    console.error("Erro ao buscar respostas:", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const session = await getSession();
    if (!session?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const data = await request.json();

    // Validação básica
    if (!data.quizId || !data.answers) {
      return new NextResponse("Dados inválidos", { status: 400 });
    }

    // Busca o quiz para validar as respostas
    const quiz = await Quiz.findById(data.quizId);
    if (!quiz) {
      return new NextResponse("Quiz não encontrado", { status: 404 });
    }

    // Calcula a pontuação
    let correctAnswers = 0;
    const answersWithResults = data.answers.map(
      (answer: any, index: number) => {
        const isCorrect =
          answer.selectedAnswer === quiz.questions[index].correctAnswer;
        if (isCorrect) correctAnswers++;
        return {
          ...answer,
          isCorrect,
        };
      }
    );

    const score = Math.round((correctAnswers / quiz.questions.length) * 100);

    // Salva a resposta
    const response = await QuizResponse.create({
      quiz: data.quizId,
      user: session.id,
      answers: answersWithResults,
      score,
      completedAt: new Date(),
    });

    // Popula os dados para retorno
    const populatedResponse = await QuizResponse.findById(response._id)
      .populate("user", "name email")
      .populate({
        path: "quiz",
        populate: {
          path: "course",
          select: "title",
        },
      });

    return NextResponse.json(populatedResponse);
  } catch (error) {
    console.error("Erro ao salvar resposta:", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}
