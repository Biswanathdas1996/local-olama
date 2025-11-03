import { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'color', 'background',
  'align',
  'link', 'image'
];

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  // Memoize to prevent unnecessary re-renders
  const memoizedModules = useMemo(() => quillModules, []);
  const memoizedFormats = useMemo(() => quillFormats, []);

  return (
    <ReactQuill
      value={value}
      onChange={onChange}
      modules={memoizedModules}
      formats={memoizedFormats}
      className={className}
      theme="snow"
      placeholder={placeholder}
    />
  );
}
