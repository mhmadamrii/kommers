import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(publics)/auth/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(publics)/auth/"!</div>
}
