import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(main)/categories/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(main)/categories/"!</div>
}
