import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(main)/products/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(main)/products/"!</div>
}
