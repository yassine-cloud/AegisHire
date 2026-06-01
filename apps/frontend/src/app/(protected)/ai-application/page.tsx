import { GenerateLetterForm } from '@/components/GenerateLetterForm';

export default function AIApplicationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Application Letter Generator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Get professional help writing your job application emails and motivation letters using AI
        </p>
      </div>
      <GenerateLetterForm />
    </div>
  );
}
