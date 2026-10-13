import { Camera, ChartNoAxesColumnIncreasing, ReceiptText } from 'lucide-react'

const ideas = [
  {
    icon: Camera,
    title: 'Capture the moment',
    copy: 'Snap a receipt, meal, or purchase.',
  },
  {
    icon: ReceiptText,
    title: 'Keep the story',
    copy: 'Turn every expense into a visual memory.',
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: 'See the pattern',
    copy: 'Understand spending without a spreadsheet.',
  },
]

export function JournalPage() {
  return (
    <main className="min-h-screen bg-stone-950 px-6 py-12 text-stone-50">
      <div className="mx-auto max-w-5xl">
        <p className="font-semibold uppercase tracking-[0.25em] text-orange-400">Billet</p>
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
          Your money has a story.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-stone-300">
          A visual expense journal for the meals, finds, and little moments worth remembering.
        </p>
        <section className="mt-16 grid gap-4 md:grid-cols-3" aria-label="How Billet works">
          {ideas.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <Icon className="h-7 w-7 text-orange-400" aria-hidden="true" />
              <h2 className="mt-8 text-xl font-medium">{title}</h2>
              <p className="mt-2 text-stone-400">{copy}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
