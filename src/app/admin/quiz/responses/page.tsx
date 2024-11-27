"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Course {
  _id: string;
  title: string;
}

interface QuizResponse {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  quiz: {
    course: Course;
  };
  score: number;
  completedAt: string;
  answers: {
    question: string;
    selectedAnswer: number;
    isCorrect: boolean;
  }[];
}

export default function QuizResponsesPage() {
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    fetchResponses();
  }, []);

  useEffect(() => {
    fetchResponses();
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error("Erro ao buscar cursos:", error);
    }
  };

  const fetchResponses = async () => {
    try {
      const url =
        selectedCourse && selectedCourse !== "all"
          ? `/api/quiz/response?courseId=${selectedCourse}`
          : "/api/quiz/response";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setResponses(data);
      }
    } catch (error) {
      console.error("Erro ao buscar respostas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calcula estatísticas
  const averageScore = responses.length
    ? (
        responses.reduce((acc, r) => acc + r.score, 0) / responses.length
      ).toFixed(1)
    : "0";

  const completionsToday = responses.filter(
    (r) => new Date(r.completedAt).toDateString() === new Date().toDateString()
  ).length;

  const passRate = responses.length
    ? (
        (responses.filter((r) => r.score >= 70).length / responses.length) *
        100
      ).toFixed(1)
    : "0";

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Resultados dos Quizzes
        </h2>
        <p className="text-muted-foreground">
          Acompanhe o desempenho dos alunos nos quizzes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completados Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionsToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Últimas Respostas</h3>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os cursos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course._id} value={course._id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Pontuação</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response._id}>
                  <TableCell>{response.user.name}</TableCell>
                  <TableCell>{response.quiz.course.title}</TableCell>
                  <TableCell>{response.score}%</TableCell>
                  <TableCell>
                    {new Date(response.completedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        response.score >= 70
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {response.score >= 70 ? "Aprovado" : "Reprovado"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}

              {responses.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    Nenhuma resposta encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
