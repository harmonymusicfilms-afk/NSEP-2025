import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Download,
  TrendingUp,
  FileText,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { CertificateDownloader } from '@/components/features';
import { useAuthStore, useExamStore, useScholarshipStore, useCertificateStore, useStudentStore } from '@/stores';
import { formatTime, getOrdinal, calculatePercentage } from '@/lib/utils';
import { EXAM_CONFIG } from '@/constants/config';
import { client } from '@/lib/backend';

export function StudentResultsPage() {
  const navigate = useNavigate();
  const { currentStudent, isStudentLoggedIn } = useAuthStore();
  const { results, loadExamData, config, isLoading: examsLoading } = useExamStore();
  const { scholarships, loadScholarships, isLoading: scholarshipsLoading } = useScholarshipStore();
  const { certificates, loadCertificates, isLoading: certsLoading } = useCertificateStore();
  const { loadStudents, isLoading: studentsLoading } = useStudentStore();

  // Search state
  const [searchStudentId, setSearchStudentId] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<any>(null);
  const [searchedResult, setSearchedResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    loadExamData();
    loadScholarships();
    loadCertificates();
    loadStudents();
  }, [loadExamData, loadScholarships, loadCertificates, loadStudents]);

  // Handle search by Student ID
  const handleSearch = async () => {
    if (!searchStudentId.trim()) {
      setSearchError('Please enter a Student ID');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchedStudent(null);
    setSearchedResult(null);

    try {
      // First, find the student by ID
      const { data: student, error: studentError } = await client
        .from('students')
        .select('*')
        .eq('id', searchStudentId)
        .single();

      if (studentError || !student) {
        setSearchError('Student not found. Please check the Student ID.');
        setIsSearching(false);
        return;
      }

      setSearchedStudent(student);

      // Then, find the result for this student
      const { data: result, error: resultError } = await client
        .from('exam_results')
        .select('*')
        .eq('student_id', searchStudentId)
        .single();

      if (resultError || !result) {
        // Student found but no result yet
        setSearchedResult(null);
      } else {
        setSearchedResult(result);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('An error occurred while searching. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const isLoading = examsLoading || scholarshipsLoading || certsLoading || studentsLoading;

  // Show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Default: show search form
  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Examination Results</h1>
          <p className="text-muted-foreground">Search for your results using Student ID</p>
        </div>

        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5" />
              Search Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter Student ID"
                value={searchStudentId}
                onChange={(e) => setSearchStudentId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="institutional-gradient"
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Search className="size-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {searchError && (
              <p className="text-red-500 text-sm">{searchError}</p>
            )}
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchedStudent && (
          <>
            {searchedResult ? (
              /* Show Result Details */
              <ResultDetails
                student={searchedStudent}
                result={searchedResult}
                certificates={certificates}
                scholarships={scholarships}
                config={config}
              />
            ) : (
              /* No Result Yet */
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="size-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="font-serif text-xl font-bold mb-2">Result Not Available Yet</h2>
                  <p className="text-muted-foreground">
                    The student with ID <strong>{searchStudentId}</strong> has not completed the examination yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Result Details Component
function ResultDetails({ student, result, certificates, scholarships, config }: {
  student: any;
  result: any;
  certificates: any[];
  scholarships: any[];
  config: any;
}) {
  const navigate = useNavigate();
  const studentResult = result;
  const studentScholarship = scholarships.find((s) => s.studentId === student.id);
  const studentCertificate = certificates.find((c) => c.studentId === student.id);

  const totalQuestions = config?.demoQuestionCount || 60;
  const accuracy = calculatePercentage(studentResult.correct_count || studentResult.correctCount, totalQuestions);
  const avgTimePerQuestion = Math.round((studentResult.total_time_taken || studentResult.totalTimeTaken) / totalQuestions);

  // Get class rank statistics
  const totalStudentsInClass = 100; // Would need to calculate from results

  return (
    <div className="space-y-6">
      {/* Student Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">{student.name}</p>
            <p className="text-sm text-muted-foreground">Student ID: {student.id}</p>
            <p className="text-sm text-muted-foreground">Class: {student.class_level || student.class}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              Rank: #{studentResult.rank || 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground">Score: {studentResult.total_score || studentResult.totalScore}</p>
          </div>
        </CardContent>
      </Card>

      {/* Score Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Trophy className="size-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rank</p>
                <p className="text-3xl font-bold">#{studentResult.rank || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="size-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-3xl font-bold text-primary">{studentResult.total_score || studentResult.totalScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="size-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Correct</p>
                <p className="text-3xl font-bold text-green-600">{studentResult.correct_count || studentResult.correctCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="size-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wrong</p>
                <p className="text-3xl font-bold text-red-600">{studentResult.wrong_count || studentResult.wrongCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
