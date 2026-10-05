// CSE Question Bank for Quiz System
// This file contains a comprehensive set of questions for Computer Science & Engineering students

const questionBank = [
  // ============================================================================
  // DATA STRUCTURES - Arrays
  // ============================================================================
  {
    id: 1,
    question: "What is the time complexity of accessing an element in an array by its index?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
    answer: "O(1)",
    topic: "Data Structures",
    subTopic: "Arrays",
    difficulty: "easy"
  },
  {
    id: 2,
    question: "Which operation in an array takes O(n) time in the worst case?",
    options: ["Accessing an element", "Inserting at the beginning", "Updating an element", "Finding the length"],
    answer: "Inserting at the beginning",
    topic: "Data Structures",
    subTopic: "Arrays",
    difficulty: "easy"
  },
  {
    id: 3,
    question: "What is the space complexity of an array of size n?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
    answer: "O(n)",
    topic: "Data Structures",
    subTopic: "Arrays",
    difficulty: "easy"
  },

  // ============================================================================
  // DATA STRUCTURES - Big O
  // ============================================================================
  {
    id: 4,
    question: "Which Big O notation represents constant time complexity?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
    answer: "O(1)",
    topic: "Data Structures",
    subTopic: "Big O",
    difficulty: "easy"
  },
  {
    id: 5,
    question: "What is the time complexity of a nested loop where both loops run n times?",
    options: ["O(n)", "O(n^2)", "O(log n)", "O(2n)"],
    answer: "O(n^2)",
    topic: "Data Structures",
    subTopic: "Big O",
    difficulty: "easy"
  },
  {
    id: 6,
    question: "Which complexity is better: O(n log n) or O(n^2)?",
    options: ["O(n log n)", "O(n^2)", "Both are same", "Cannot be determined"],
    answer: "O(n log n)",
    topic: "Data Structures",
    subTopic: "Big O",
    difficulty: "easy"
  },

  // ============================================================================
  // DATA STRUCTURES - Linked Lists
  // ============================================================================
  {
    id: 7,
    question: "What is the advantage of a linked list over an array?",
    options: [
      "Constant time access to elements",
      "Dynamic size allocation",
      "Better cache locality",
      "Less memory usage"
    ],
    answer: "Dynamic size allocation",
    topic: "Data Structures",
    subTopic: "Linked Lists",
    difficulty: "medium"
  },
  {
    id: 8,
    question: "In a singly linked list, what is the time complexity of inserting a node at the beginning?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
    answer: "O(1)",
    topic: "Data Structures",
    subTopic: "Linked Lists",
    difficulty: "medium"
  },
  {
    id: 9,
    question: "What is a circular linked list?",
    options: [
      "A list where each node points to the next node",
      "A list where the last node points back to the first node",
      "A list where nodes are stored in circular memory",
      "A list that can only store circular data"
    ],
    answer: "A list where the last node points back to the first node",
    topic: "Data Structures",
    subTopic: "Linked Lists",
    difficulty: "medium"
  },
  {
    id: 10,
    question: "How do you detect a cycle in a linked list efficiently?",
    options: [
      "Using two pointers (Floyd's algorithm)",
      "Using recursion",
      "Using an array to store visited nodes",
      "Traversing the list twice"
    ],
    answer: "Using two pointers (Floyd's algorithm)",
    topic: "Data Structures",
    subTopic: "Linked Lists",
    difficulty: "medium"
  },

  // ============================================================================
  // ALGORITHMS - Sorting
  // ============================================================================
  {
    id: 11,
    question: "Which sorting algorithm has the best average time complexity?",
    options: ["Bubble Sort", "Merge Sort", "Selection Sort", "Insertion Sort"],
    answer: "Merge Sort",
    topic: "Algorithms",
    subTopic: "Sorting",
    difficulty: "medium"
  },
  {
    id: 12,
    question: "Which sorting algorithm is stable?",
    options: ["Quick Sort", "Heap Sort", "Merge Sort", "Selection Sort"],
    answer: "Merge Sort",
    topic: "Algorithms",
    subTopic: "Sorting",
    difficulty: "medium"
  },
  {
    id: 13,
    question: "What is the time complexity of Quick Sort in the worst case?",
    options: ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"],
    answer: "O(n^2)",
    topic: "Algorithms",
    subTopic: "Sorting",
    difficulty: "medium"
  },
  {
    id: 14,
    question: "Which sorting algorithm works best for nearly sorted arrays?",
    options: ["Merge Sort", "Quick Sort", "Insertion Sort", "Heap Sort"],
    answer: "Insertion Sort",
    topic: "Algorithms",
    subTopic: "Sorting",
    difficulty: "medium"
  },

  // ============================================================================
  // ALGORITHMS - Recursion
  // ============================================================================
  {
    id: 15,
    question: "What is the base case in recursion?",
    options: [
      "The first function call",
      "The condition that stops recursion",
      "The recursive call itself",
      "The return statement"
    ],
    answer: "The condition that stops recursion",
    topic: "Algorithms",
    subTopic: "Recursion",
    difficulty: "medium"
  },
  {
    id: 16,
    question: "What happens if a recursive function doesn't have a base case?",
    options: [
      "It runs once and stops",
      "It results in infinite recursion and stack overflow",
      "It returns null",
      "It throws a compilation error"
    ],
    answer: "It results in infinite recursion and stack overflow",
    topic: "Algorithms",
    subTopic: "Recursion",
    difficulty: "medium"
  },
  {
    id: 17,
    question: "What is tail recursion?",
    options: [
      "Recursion at the end of a program",
      "When the recursive call is the last operation in the function",
      "Recursion that uses the tail of a linked list",
      "A type of recursion that cannot be optimized"
    ],
    answer: "When the recursive call is the last operation in the function",
    topic: "Algorithms",
    subTopic: "Recursion",
    difficulty: "medium"
  },

  // ============================================================================
  // DATABASE SYSTEMS - SQL Joins
  // ============================================================================
  {
    id: 18,
    question: "Which SQL JOIN returns all records when there is a match in either left or right table?",
    options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"],
    answer: "FULL OUTER JOIN",
    topic: "Database Systems",
    subTopic: "SQL Joins",
    difficulty: "easy"
  },
  {
    id: 19,
    question: "What does INNER JOIN return?",
    options: [
      "All records from both tables",
      "Only matching records from both tables",
      "All records from left table",
      "All records from right table"
    ],
    answer: "Only matching records from both tables",
    topic: "Database Systems",
    subTopic: "SQL Joins",
    difficulty: "easy"
  },
  {
    id: 20,
    question: "Which JOIN returns all records from the left table and matched records from the right table?",
    options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "CROSS JOIN"],
    answer: "LEFT JOIN",
    topic: "Database Systems",
    subTopic: "SQL Joins",
    difficulty: "easy"
  },

  // ============================================================================
  // DATABASE SYSTEMS - Normalization
  // ============================================================================
  {
    id: 21,
    question: "What is the purpose of database normalization?",
    options: [
      "To increase data redundancy",
      "To reduce data redundancy and improve data integrity",
      "To make queries slower",
      "To increase storage space"
    ],
    answer: "To reduce data redundancy and improve data integrity",
    topic: "Database Systems",
    subTopic: "Normalization",
    difficulty: "hard"
  },
  {
    id: 22,
    question: "Which normal form ensures that all non-key attributes are fully functionally dependent on the primary key?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    answer: "2NF",
    topic: "Database Systems",
    subTopic: "Normalization",
    difficulty: "hard"
  },
  {
    id: 23,
    question: "What does BCNF stand for?",
    options: [
      "Basic Canonical Normal Form",
      "Boyce-Codd Normal Form",
      "Binary Composite Normal Form",
      "Base Case Normal Form"
    ],
    answer: "Boyce-Codd Normal Form",
    topic: "Database Systems",
    subTopic: "Normalization",
    difficulty: "hard"
  },
  {
    id: 24,
    question: "In which normal form should there be no repeating groups?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    answer: "1NF",
    topic: "Database Systems",
    subTopic: "Normalization",
    difficulty: "hard"
  },

  // ============================================================================
  // OPERATING SYSTEMS - Process vs Thread
  // ============================================================================
  {
    id: 25,
    question: "What is the main difference between a process and a thread?",
    options: [
      "Processes share memory, threads don't",
      "Threads share memory within a process, processes have separate memory",
      "There is no difference",
      "Threads are heavier than processes"
    ],
    answer: "Threads share memory within a process, processes have separate memory",
    topic: "Operating Systems",
    subTopic: "Process vs Thread",
    difficulty: "easy"
  },
  {
    id: 26,
    question: "Which is lighter in terms of resource consumption?",
    options: ["Process", "Thread", "Both are same", "Depends on the OS"],
    answer: "Thread",
    topic: "Operating Systems",
    subTopic: "Process vs Thread",
    difficulty: "easy"
  },
  {
    id: 27,
    question: "What does context switching between threads involve compared to processes?",
    options: [
      "Same overhead",
      "Less overhead for threads",
      "More overhead for threads",
      "Context switching doesn't apply to threads"
    ],
    answer: "Less overhead for threads",
    topic: "Operating Systems",
    subTopic: "Process vs Thread",
    difficulty: "easy"
  },
  {
    id: 28,
    question: "Can multiple threads within a process execute simultaneously?",
    options: [
      "No, never",
      "Yes, on multi-core processors",
      "Only if they are in different processes",
      "Only on single-core processors"
    ],
    answer: "Yes, on multi-core processors",
    topic: "Operating Systems",
    subTopic: "Process vs Thread",
    difficulty: "easy"
  },

  // ============================================================================
  // BONUS QUESTIONS - Additional CSE Topics
  // ============================================================================
  {
    id: 29,
    question: "What is the purpose of a constructor in Object-Oriented Programming?",
    options: [
      "To destroy objects",
      "To initialize objects when they are created",
      "To copy objects",
      "To compare objects"
    ],
    answer: "To initialize objects when they are created",
    topic: "Object-Oriented Programming",
    subTopic: "Classes and Objects",
    difficulty: "easy"
  },
  {
    id: 30,
    question: "What is polymorphism in OOP?",
    options: [
      "Having multiple classes",
      "The ability of different objects to respond to the same message in different ways",
      "Creating multiple objects",
      "Inheriting from multiple classes"
    ],
    answer: "The ability of different objects to respond to the same message in different ways",
    topic: "Object-Oriented Programming",
    subTopic: "Polymorphism",
    difficulty: "medium"
  }
];

// Export the question bank
export default questionBank;

// Helper functions to filter questions
export const getQuestionsByTopic = (topic) => {
  return questionBank.filter(q => q.topic === topic);
};

export const getQuestionsByDifficulty = (difficulty) => {
  return questionBank.filter(q => q.difficulty === difficulty);
};

export const getQuestionsBySubTopic = (subTopic) => {
  return questionBank.filter(q => q.subTopic === subTopic);
};

export const getRandomQuestions = (count) => {
  const shuffled = [...questionBank].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Summary statistics
export const getQuestionBankStats = () => {
  return {
    total: questionBank.length,
    byTopic: questionBank.reduce((acc, q) => {
      acc[q.topic] = (acc[q.topic] || 0) + 1;
      return acc;
    }, {}),
    byDifficulty: questionBank.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {}),
    topics: [...new Set(questionBank.map(q => q.topic))],
    subTopics: [...new Set(questionBank.map(q => q.subTopic))]
  };
};
