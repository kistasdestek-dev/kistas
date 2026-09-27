import { Fragment, type ReactNode } from 'react';

interface BlogArticleContentProps {
  content: string;
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index} className="font-extrabold text-white">{part.slice(2, -2)}</strong>
      : part,
  );
}

export function BlogArticleContent({ content }: BlogArticleContentProps) {
  const blocks: ReactNode[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let listItems: string[] = [];

  const flushList = (key: number) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${key}`} className="my-5 list-disc space-y-2 pl-6 marker:text-blue-400">
        {listItems.map((item, index) => <li key={`${key}-${index}`}>{renderInline(item)}</li>)}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
      return;
    }
    flushList(index);
    if (!line || line === '---') return;
    if (line.startsWith('### ')) {
      blocks.push(<h3 key={index} className="mb-3 mt-8 text-xl font-black text-white">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      blocks.push(<h2 key={index} className="mb-4 mt-10 text-2xl font-black tracking-tight text-white">{line.slice(3)}</h2>);
    } else {
      blocks.push(<p key={index} className="my-4 text-[15px] leading-8 text-slate-300 sm:text-base">{renderInline(line)}</p>);
    }
  });
  flushList(lines.length);

  return <Fragment>{blocks}</Fragment>;
}
