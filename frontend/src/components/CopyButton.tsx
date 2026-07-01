import { useState } from 'react';

interface CopyButtonProps {
  content: string;
}

export default function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <button
      className={`btn ${copied ? 'btn-success' : 'btn-primary'} btn-sm`}
      onClick={handleCopy}
    >
      {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
    </button>
  );
}
