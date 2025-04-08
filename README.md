# Text Reveal

Text Reveal is an interactive web application designed to help with learning and teaching by creating engaging text-based exercises with hidden blanks.

## 🚀 Features

- **Blank Text Reveal**: Create documents with hidden blanks that can be progressively revealed
- **Audio Support**: Add audio files for each page to enhance learning experience
- **Local Storage**: Save and manage multiple documents in your browser
- **Responsive Design**: Works on desktop and mobile devices
- **Keyboard Navigation**: Easy navigation using arrow keys

## 📦 Technologies Used

- **Frontend**: React, Astro
- **Styling**: SCSS with CSS Variables
- **State Management**: Local Storage
- **Build Tool**: Vite (via Astro)

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/text-reveal.git
cd text-reveal
```

2. Install dependencies
```bash
npm install
```

3. Run the development server
```bash
npm run dev
```

4. Open `http://localhost:3000` in your browser

## 📝 Usage

### Creating a Document

1. Go to the home page
2. Upload a text file or paste content directly
3. Format your text using double underscores `__` for blanks
4. Provide answers in square brackets `[]`

#### Example Format
```
Title of the Page,

This is a sample text with __ and __.
[first blank, second blank]

PAGE

Next Page Title,

Another paragraph with __.
[another blank]
```

## 🔑 Keyboard Controls

- `→`: Reveal next blank
- `←`: Hide last blank
- `↓`: Next page
- `↑`: Previous page

## 💾 Local Storage

- Documents are saved locally in your browser
- Manage saved documents in the Browse Files section

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source. [Add specific license details]

## 🙏 Acknowledgments

- Inspired by interactive learning techniques
- Built with Astro and React
