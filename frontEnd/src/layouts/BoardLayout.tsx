import type { ReactNode } from "react";

type BoardLayoutProps = {
  header: ReactNode;
  toolbar: ReactNode;
  canvas: ReactNode;
  inspector: ReactNode;
};

function BoardLayout({ header, toolbar, canvas, inspector }: BoardLayoutProps) {
  return (
    <main className="app-shell">
      {header}
      <section className="workspace">
        {toolbar}
        {canvas}
        {inspector}
      </section>
    </main>
  );
}

export default BoardLayout;
