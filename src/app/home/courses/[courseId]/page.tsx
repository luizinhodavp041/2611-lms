"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VideoPlayer } from "@/components/video/video-player";
import {
  ChevronLeft,
  Play,
  CheckCircle,
  Circle,
  FileQuestion,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { TakeQuizDialog } from "@/components/quiz/take-quiz-dialog";

interface Lesson {
  _id: string;
  title: string;
  description: string;
  videoPublicId?: string;
}

interface Module {
  _id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface Course {
  _id: string;
  title: string;
  description: string;
  modules: Module[];
}

interface Quiz {
  _id: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
}

interface QuizResponse {
  _id: string;
  score: number;
  completedAt: string;
}

export default function CoursePage({
  params,
}: {
  params: { courseId: string };
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResponse, setQuizResponse] = useState<QuizResponse | null>(null);

  useEffect(() => {
    fetchCourse();
    fetchProgress();
    fetchQuiz();
    fetchQuizResponse();
  }, []);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}`);
      if (!response.ok) throw new Error("Erro ao carregar curso");
      const data = await response.json();
      setCourse(data);

      // Seleciona a primeira aula por padrão
      if (data.modules[0]?.lessons[0]) {
        setSelectedLesson(data.modules[0].lessons[0]);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/progress?courseId=${params.courseId}`);
      if (!response.ok) throw new Error("Erro ao carregar progresso");
      const progress = await response.json();
      setCompletedLessons(progress.map((p: any) => p.lesson));
    } catch (error) {
      console.error("Erro ao carregar progresso:", error);
    }
  };

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`/api/quiz?courseId=${params.courseId}`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
      }
    } catch (error) {
      console.error("Erro ao carregar quiz:", error);
    }
  };

  const fetchQuizResponse = async () => {
    try {
      const response = await fetch(
        `/api/quiz/response/user?courseId=${params.courseId}`
      );
      if (response.ok) {
        const data = await response.json();
        setQuizResponse(data);
      }
    } catch (error) {
      console.error("Erro ao carregar resposta do quiz:", error);
    }
  };

  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const findNextLesson = (currentLessonId: string) => {
    let foundCurrent = false;
    for (const module of course?.modules || []) {
      for (const lesson of module.lessons) {
        if (foundCurrent) {
          return lesson;
        }
        if (lesson._id === currentLessonId) {
          foundCurrent = true;
        }
      }
    }
    return null;
  };

  const handleLessonComplete = async (lessonId: string) => {
    if (!completedLessons.includes(lessonId)) {
      setCompletedLessons((prev) => [...prev, lessonId]);
    }

    if (selectedLesson) {
      const nextLesson = findNextLesson(selectedLesson._id);
      if (nextLesson) {
        setSelectedLesson(nextLesson);
      }
    }
  };

  const handleQuizComplete = async () => {
    setShowQuiz(false);
    await fetchQuizResponse(); // Atualiza o estado do quiz após completá-lo
  };

  // Verifica se todas as aulas foram completadas
  const allLessonsCompleted = course?.modules.every((module) =>
    module.lessons.every((lesson) => completedLessons.includes(lesson._id))
  );

  // Função auxiliar para formatar a data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!course) {
    return <div>Curso não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/home/courses">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{course.title}</h2>
          <p className="text-muted-foreground">{course.description}</p>
        </div>
        {allLessonsCompleted && quiz && (
          <div>
            {quizResponse ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Quiz completado em {formatDate(quizResponse.completedAt)} -{" "}
                  {quizResponse.score}%
                </span>
                <Button variant="outline" disabled>
                  <Lock className="h-4 w-4 mr-2" />
                  Quiz Completado
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowQuiz(true)} variant="outline">
                <FileQuestion className="h-4 w-4 mr-2" />
                Quiz Final
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {selectedLesson && (
            <>
              <div className="aspect-video">
                <VideoPlayer
                  publicId={selectedLesson.videoPublicId || ""}
                  title={selectedLesson.title}
                  lessonId={selectedLesson._id}
                  courseId={params.courseId}
                  onComplete={handleLessonComplete}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedLesson.title}
                </h3>
                <p className="text-muted-foreground">
                  {selectedLesson.description}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="border rounded-lg">
          <Accordion type="single" collapsible className="w-full">
            {course.modules.map((module, moduleIndex) => (
              <AccordionItem key={module._id} value={module._id}>
                <AccordionTrigger className="px-4">
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-semibold">
                      Módulo {moduleIndex + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {module.title}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-1">
                  {module.lessons.map((lesson) => (
                    <button
                      key={lesson._id}
                      onClick={() => handleLessonSelect(lesson)}
                      className={`w-full flex items-center gap-2 p-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${
                        selectedLesson?._id === lesson._id ? "bg-accent" : ""
                      }`}
                    >
                      {completedLessons.includes(lesson._id) ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : selectedLesson?._id === lesson._id ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                      {lesson.title}
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {quiz && (
        <TakeQuizDialog
          quiz={quiz}
          open={showQuiz}
          onOpenChange={setShowQuiz}
          onComplete={handleQuizComplete}
        />
      )}
    </div>
  );
}
