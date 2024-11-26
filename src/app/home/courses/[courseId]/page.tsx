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
import { ChevronLeft, Play, CheckCircle, Circle } from "lucide-react";
import Link from "next/link";

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

export default function CoursePage({
  params,
}: {
  params: { courseId: string };
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    fetchCourse();
    fetchProgress();
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

  // Função para mudar a aula selecionada
  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  // Função para encontrar a próxima aula
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

  // Callback para atualizar o progresso quando uma aula é completada
  const handleLessonComplete = async (lessonId: string) => {
    // Atualiza o estado local imediatamente
    if (!completedLessons.includes(lessonId)) {
      setCompletedLessons((prev) => [...prev, lessonId]);
    }

    // Encontra e seleciona a próxima aula
    if (selectedLesson) {
      const nextLesson = findNextLesson(selectedLesson._id);
      if (nextLesson) {
        setSelectedLesson(nextLesson);
      }
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!course) {
    return <div>Curso não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/home/courses">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{course.title}</h2>
          <p className="text-muted-foreground">{course.description}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        {/* Video Player and Lesson Info */}
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

        {/* Course Content */}
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
    </div>
  );
}
