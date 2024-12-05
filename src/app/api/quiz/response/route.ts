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

    // Busca respostas com validação adicional
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

    // Filtra respostas sem quiz ou curso válido
    const validResponses = responses.filter(
      (response) => response.quiz && response.quiz.course
    );

    // Mapeia as respostas para garantir formato consistente
    const formattedResponses = validResponses.map((response) => ({
      _id: response._id,
      user: {
        name: response.user?.name || "Usuário não encontrado",
        email: response.user?.email || "",
      },
      quiz: {
        course: response.quiz?.course
          ? {
              _id: response.quiz.course._id,
              title: response.quiz.course.title,
            }
          : null,
      },
      score: response.score,
      completedAt: response.completedAt,
      answers: response.answers,
    }));

    return NextResponse.json(formattedResponses);
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

    // Busca o quiz e valida se existe e tem um curso associado
    const quiz = await Quiz.findById(data.quizId).populate("course");
    if (!quiz) {
      return new NextResponse("Quiz não encontrado", { status: 404 });
    }

    if (!quiz.course) {
      return new NextResponse("Quiz sem curso associado", { status: 400 });
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

    // Popula os dados para retorno com validação
    const populatedResponse = await QuizResponse.findById(response._id)
      .populate("user", "name email")
      .populate({
        path: "quiz",
        populate: {
          path: "course",
          select: "title",
        },
      });

    if (!populatedResponse) {
      return new NextResponse("Erro ao criar resposta", { status: 500 });
    }

    // Garante formato consistente na resposta
    const formattedResponse = {
      _id: populatedResponse._id,
      user: {
        name: populatedResponse.user?.name || "Usuário não encontrado",
        email: populatedResponse.user?.email || "",
      },
      quiz: {
        course: populatedResponse.quiz?.course
          ? {
              _id: populatedResponse.quiz.course._id,
              title: populatedResponse.quiz.course.title,
            }
          : null,
      },
      score: populatedResponse.score,
      completedAt: populatedResponse.completedAt,
      answers: populatedResponse.answers,
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error("Erro ao salvar resposta:", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}
