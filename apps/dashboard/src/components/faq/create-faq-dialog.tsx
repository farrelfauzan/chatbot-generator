import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateFaq } from "@/hooks/use-faq"

export function CreateFaqDialog() {
  const [open, setOpen] = useState(false)
  const createFaq = useCreateFaq()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createFaq.mutate(
      {
        question: formData.get("question") as string,
        answer: formData.get("answer") as string,
        category: (formData.get("category") as string) || null,
        isActive: true,
      },
      { onSuccess: () => setOpen(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add FAQ</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create FAQ Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input id="question" name="question" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="answer">Answer</Label>
            <Textarea id="answer" name="answer" rows={4} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" />
          </div>
          <Button type="submit" className="w-full" disabled={createFaq.isPending}>
            {createFaq.isPending ? "Creating..." : "Create FAQ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
