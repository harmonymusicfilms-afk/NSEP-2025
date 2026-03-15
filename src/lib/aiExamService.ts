import { client as backend } from '@/lib/backend';
import { Syllabus, ExamQuestion } from '@/types';
import { generateId } from '@/lib/utils';

/**
 * AI Exam Question Generator Service
 * Responsible for generating class-specific exam questions strictly based on the approved syllabus.
 */
export const AIExamService = {
    /**
     * Generates a batch of questions for a specific class level using AI
     * @param classLevel The class level to generate questions for
     * @param count Number of questions to generate (default 60)
     */
    async generateQuestionsFromSyllabus(classLevel: number, count: number = 60): Promise<{ success: boolean; questions: ExamQuestion[]; reportId: string }> {
        try {
            // 1. Fetch approved syllabus for this class
            const { data: syllabusData, error: syllabusError } = await backend
                .from('syllabuses')
                .select('*')
                .eq('class_level', classLevel)
                .eq('is_active', true)
                .single();

            if (syllabusError || !syllabusData) {
                throw new Error(`Active syllabus not found for Class ${classLevel}`);
            }

            const syllabus = syllabusData as Syllabus;
            const topicsList = syllabus.topics.map(t => `${t.title}: ${t.description}`).join('\n');

            // 2. Log the start of AI generation
            const { data: reportData, error: reportError } = await backend
                .from('ai_generation_reports')
                .insert([{
                    class_level: classLevel,
                    syllabus_id: syllabus.id,
                    status: 'PROCESSING',
                    prompt_used: `Generate ${count} multiple choice questions for Class ${classLevel} based on the following topics:\n${topicsList}`
                }])
                .select()
                .single();

            if (reportError) throw reportError;

            // 3. AI Engine Call (Simulated for architectural demonstration)
            // In a production environment, this would call an Edge Function that interacts with Gemini/OpenAI
            console.log(`[AI Engine] Generating ${count} questions for Class ${classLevel} based on syllabus...`);

            const generatedQuestions = await this.mockAIEngineCall(classLevel, syllabus, count);

            // 4. Save generated questions to the database
            const dbQuestions = generatedQuestions.map(q => ({
                class_level: q.class,
                question_text: q.question,
                options: q.options,
                correct_option_index: q.correctOption,
                explanation: q.explanation,
                difficulty: q.difficulty || 'MEDIUM',
                subject: syllabus.subject,
                syllabus_topic: q.syllabusTopic // Track which topic this question maps to
            }));

            const { error: insertError } = await backend
                .from('exam_questions')
                .insert(dbQuestions);

            if (insertError) throw insertError;

            // 5. Update report status
            const { error: updateError } = await backend
                .from('ai_generation_reports')
                .update({
                    status: 'SUCCESS',
                    questions_generated: generatedQuestions.length
                })
                .eq('id', reportData.id);

            if (updateError) {
                console.error('Failed to update AI generation report:', updateError);
            }

            return { success: true, questions: generatedQuestions, reportId: reportData.id };

        } catch (error: any) {
            console.error('AI Generation Error:', error);
            return { success: false, questions: [], reportId: '' };
        }
    },

    /**
     * Mocks the AI Engine response using internal logic or predefined patterns
     * This ensures the "backend-driven" logic works even without external API keys during development.
     */
    async mockAIEngineCall(classLevel: number, syllabus: Syllabus, count: number): Promise<ExamQuestion[]> {
        const questions: ExamQuestion[] = [];
        const topics = syllabus.topics;

        for (let i = 0; i < count; i++) {
            const topic = topics[i % topics.length];
            questions.push({
                id: generateId(),
                class: classLevel,
                question: `[AI Generated] Question about ${topic.title}: What characteristic best defines this topic?`,
                options: [
                    `Option A related to ${topic.description.slice(0, 20)}`,
                    `Option B related to ${topic.title}`,
                    `Option C (The Correct One)`,
                    `Option D (None of the above)`
                ],
                correctOption: 2,
                explanation: `This question was generated automatically based on the syllabus topic: ${topic.title}.`,
                difficulty: i % 3 === 0 ? 'HARD' : i % 3 === 1 ? 'MEDIUM' : 'EASY',
                syllabusTopic: topic.title
            });
        }

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        return questions;
    }
};
