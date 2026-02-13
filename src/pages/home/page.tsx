import { AppBar, MarketingFooter, Sizer } from '@/components'
import React, { useRef } from 'react'
import { Link } from 'react-router'
import { FeaturedSongsPreview } from './FeaturedSongsPreview'

export default function Home() {
  return (
    <>
      <div className="bg-background relative flex min-h-screen w-full flex-col text-white">
        <AppBar />
        <div className="bg-violet-600">
          <div className="mx-auto w-full max-w-(--breakpoint-lg) px-6 py-10">
            <div className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col gap-4 text-center md:text-left">
                <h1 className="text-responsive-xxl font-bold">Your Piano Journey Begins Here</h1>
                <h3 className="text-responsive-xl text-white/85">
                  Plug in your keyboard and learn, right in your browser
                </h3>
                <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                  <Link to={'/songs'}>
                    <Button className="bg-white text-gray-900 shadow-sm hover:bg-violet-100 active:bg-violet-200 active:shadow-inner">
                      Learn a song
                    </Button>
                  </Link>
                  <Link to={'/freeplay'}>
                    <Button className="border border-white/50 text-white hover:bg-white/10">
                      Free play
                    </Button>
                  </Link>
                  <AddSongButton />
                </div>
              </div>
              <div className="flex justify-center md:justify-end">
                <div className="w-full rounded-2xl shadow-[0_18px_40px_rgba(17,24,39,0.35)]">
                  <FeaturedSongsPreview className="w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-background">
          <div className="mx-auto w-full max-w-(--breakpoint-lg) px-6 py-16">
            <h3 className="text-lg font-semibold text-gray-900">Why Sightread</h3>
            <p className="mt-2 text-sm text-gray-600">A few reasons to give it a try.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div
                className="glint-card rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  const x = event.clientX - rect.left
                  const y = event.clientY - rect.top
                  event.currentTarget.style.setProperty('--glint-x', `${x}px`)
                  event.currentTarget.style.setProperty('--glint-y', `${y}px`)
                }}
              >
                <h3 className="text-base font-semibold text-gray-900">Your Own Music</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Works with any MIDI file. We'll automatically detect which track is for which
                  hand.
                </p>
              </div>
              <div
                className="glint-card rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  const x = event.clientX - rect.left
                  const y = event.clientY - rect.top
                  event.currentTarget.style.setProperty('--glint-x', `${x}px`)
                  event.currentTarget.style.setProperty('--glint-y', `${y}px`)
                }}
              >
                <h3 className="text-base font-semibold text-gray-900">Learn at Your Own Pace</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Tempo controls and Wait Mode let you slow down and focus on accuracy.
                </p>
              </div>
              <div
                className="glint-card rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  const x = event.clientX - rect.left
                  const y = event.clientY - rect.top
                  event.currentTarget.style.setProperty('--glint-x', `${x}px`)
                  event.currentTarget.style.setProperty('--glint-y', `${y}px`)
                }}
              >
                <h3 className="text-base font-semibold text-gray-900">Multiple Modes</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Falling Notes or Sheet Hero. Switch views to match how you learn.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-auto">
          <MarketingFooter />
        </div>
      </div>
    </>
  )
}

function AddSongButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = React.useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('uploading')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setStatus('done')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
    // Reset input so the same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = ''
  }

  const label =
    status === 'uploading' ? 'Uploading...' :
    status === 'done' ? 'Added!' :
    status === 'error' ? 'Failed' :
    'Add a song'

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        className="border border-white/50 text-white hover:bg-white/10"
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  )
}

function Button({
  children,
  style,
  className,
  onClick,
}: {
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      className={className}
      onClick={onClick}
      style={{
        transition: 'background-color 150ms',
        cursor: 'pointer',
        fontSize: 'clamp(0.875rem, 0.875rem + 0.35vw, 1.05rem)',
        padding: '8px 16px',
        borderRadius: 10,
        fontWeight: 500,
        minWidth: 'max-content',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
