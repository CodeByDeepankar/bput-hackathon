# CSE Question Bank Documentation

## Overview
This question bank contains **30 comprehensive questions** for Computer Science & Engineering students, covering key topics from the CSE curriculum.

## 📚 Question Distribution

### By Topic:
- **Data Structures**: 10 questions
  - Arrays: 3 questions (easy)
  - Big O Notation: 3 questions (easy)
  - Linked Lists: 4 questions (medium)

- **Algorithms**: 7 questions
  - Sorting: 4 questions (medium)
  - Recursion: 3 questions (medium)

- **Database Systems**: 7 questions
  - SQL Joins: 3 questions (easy)
  - Normalization: 4 questions (hard)

- **Operating Systems**: 4 questions
  - Process vs Thread: 4 questions (easy)

- **Object-Oriented Programming**: 2 bonus questions
  - Classes and Objects: 1 question (easy)
  - Polymorphism: 1 question (medium)

### By Difficulty:
- **Easy**: 15 questions
- **Medium**: 12 questions
- **Hard**: 4 questions

## 🎯 Question Structure

Each question object contains:
```javascript
{
  id: Number,              // Unique identifier
  question: String,        // The question text
  options: Array<String>,  // 4 multiple choice options
  answer: String,          // Correct answer (must match one option)
  topic: String,           // Main topic category
  subTopic: String,        // Specific subtopic
  difficulty: String       // "easy", "medium", or "hard"
}
```

## 📖 Example Question

```javascript
{
  id: 1,
  question: "What is the time complexity of accessing an element in an array by its index?",
  options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
  answer: "O(1)",
  topic: "Data Structures",
  subTopic: "Arrays",
  difficulty: "easy"
}
```

## 🛠️ Helper Functions

The question bank includes several utility functions:

### 1. Filter by Topic
```javascript
import { getQuestionsByTopic } from '@/data/cse-question-bank';

const dsQuestions = getQuestionsByTopic('Data Structures');
```

### 2. Filter by Difficulty
```javascript
import { getQuestionsByDifficulty } from '@/data/cse-question-bank';

const easyQuestions = getQuestionsByDifficulty('easy');
```

### 3. Filter by SubTopic
```javascript
import { getQuestionsBySubTopic } from '@/data/cse-question-bank';

const arrayQuestions = getQuestionsBySubTopic('Arrays');
```

### 4. Get Random Questions
```javascript
import { getRandomQuestions } from '@/data/cse-question-bank';

const quiz = getRandomQuestions(10); // Get 10 random questions
```

### 5. Get Statistics
```javascript
import { getQuestionBankStats } from '@/data/cse-question-bank';

const stats = getQuestionBankStats();
console.log(stats);
// Output:
// {
//   total: 30,
//   byTopic: { "Data Structures": 10, "Algorithms": 7, ... },
//   byDifficulty: { "easy": 15, "medium": 12, "hard": 4 },
//   topics: ["Data Structures", "Algorithms", ...],
//   subTopics: ["Arrays", "Big O", "Linked Lists", ...]
// }
```

## 🚀 Usage in Your App

### Import the Question Bank
```javascript
import questionBank from '@/data/cse-question-bank';
```

### Create a Quiz
```javascript
import { getRandomQuestions, getQuestionsByDifficulty } from '@/data/cse-question-bank';

// Random 10-question quiz
const randomQuiz = getRandomQuestions(10);

// Easy questions only
const beginnerQuiz = getQuestionsByDifficulty('easy').slice(0, 10);

// Topic-specific quiz
const dsQuiz = getQuestionsByTopic('Data Structures');
```

### Display a Question
```javascript
const Question = ({ questionData }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  
  return (
    <div>
      <h3>{questionData.question}</h3>
      {questionData.options.map((option, index) => (
        <button 
          key={index}
          onClick={() => setSelectedAnswer(option)}
          className={selectedAnswer === option ? 'selected' : ''}
        >
          {option}
        </button>
      ))}
    </div>
  );
};
```

## 📊 Topics Covered

### 1. Data Structures
- **Arrays**: Time complexity, operations, space complexity
- **Big O Notation**: Complexity analysis, comparison
- **Linked Lists**: Advantages, operations, cycle detection

### 2. Algorithms
- **Sorting**: Time complexity, stability, best-case scenarios
- **Recursion**: Base cases, tail recursion, stack overflow

### 3. Database Systems
- **SQL Joins**: INNER, LEFT, RIGHT, FULL OUTER
- **Normalization**: Normal forms (1NF, 2NF, 3NF, BCNF), purpose

### 4. Operating Systems
- **Process vs Thread**: Memory sharing, resource consumption, context switching

### 5. Object-Oriented Programming (Bonus)
- **Classes and Objects**: Constructors
- **Polymorphism**: Concept and implementation

## 🎓 Learning Path

### Beginner (Easy Questions)
Start with:
- Arrays
- Big O Notation
- SQL Joins
- Process vs Thread

### Intermediate (Medium Questions)
Progress to:
- Linked Lists
- Sorting Algorithms
- Recursion
- OOP Concepts

### Advanced (Hard Questions)
Master:
- Database Normalization
- BCNF and Normal Forms

## 🔧 Customization

You can easily extend the question bank by adding more questions following the same structure:

```javascript
{
  id: 31,
  question: "Your new question here?",
  options: ["Option 1", "Option 2", "Option 3", "Option 4"],
  answer: "Option 1",
  topic: "Your Topic",
  subTopic: "Your SubTopic",
  difficulty: "easy|medium|hard"
}
```

## 📝 Best Practices

1. **Unique IDs**: Always use unique IDs for each question
2. **Clear Questions**: Write clear, unambiguous questions
3. **Balanced Options**: Ensure all options are plausible
4. **Correct Answers**: Double-check that the answer matches exactly one option
5. **Difficulty Consistency**: Assign difficulty levels consistently

## 🎯 Integration with Quiz System

This question bank can be integrated with your existing quiz component:

```javascript
// In your quiz component
import questionBank, { getRandomQuestions } from '@/data/cse-question-bank';

export default function QuizComponent() {
  const [questions, setQuestions] = useState([]);
  
  useEffect(() => {
    // Load 10 random questions for the quiz
    setQuestions(getRandomQuestions(10));
  }, []);
  
  // Rest of your quiz logic...
}
```

## 📈 Future Enhancements

Consider adding:
- **Explanations**: Add an explanation field for each answer
- **Tags**: Multiple tags for better filtering
- **Images**: Support for diagrams and visual aids
- **Code Snippets**: Questions with code examples
- **Hints**: Progressive hints for harder questions
- **Time Limits**: Suggested time per question
- **Points**: Point values based on difficulty

## 📞 Support

For questions or additions to the question bank, please:
1. Check existing questions for similar content
2. Follow the established structure
3. Test thoroughly before adding

---

**Happy Learning! 🚀**
