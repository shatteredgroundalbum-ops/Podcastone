import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

interface AIProviderSelectorProps {
  provider: string
  onProviderChange: (provider: string) => void
  availableModels?: { provider: string; model: string; label: string }[]
}

const defaultModels = [
  { provider: "together", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B" },
  { provider: "together", model: "mistralai/Mixtral-8x22B-Instruct-v0.1", label: "Mixtral 8x22B" },
  { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)" },
  { provider: "openrouter", model: "google/gemma-3-27b-it:free", label: "Gemma 3 27B (Free)" },
]

export function AIProviderSelector({ provider, onProviderChange, availableModels }: AIProviderSelectorProps) {
  const models = availableModels || defaultModels

  const providerLabel = (p: string) => {
    if (p === "auto") return "Auto"
    if (p === "together") return "Together.AI"
    if (p === "openrouter") return "OpenRouter"
    return p.startsWith("model:") ? p.slice(6).split("/").pop() || p : p
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">AI Provider</Label>
        {provider !== "auto" && (
          <Badge variant="secondary" className="gap-1 text-xs px-2 py-0">
            <Sparkles className="h-3 w-3" />
            {providerLabel(provider)}
          </Badge>
        )}
      </div>
      <Select value={provider} onValueChange={onProviderChange}>
        <SelectTrigger className="w-full h-9 text-sm">
          <SelectValue placeholder="Auto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Auto (best available)</SelectItem>
          
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">Providers</SelectLabel>
            <SelectItem value="together">Together.AI</SelectItem>
            <SelectItem value="openrouter">OpenRouter</SelectItem>
          </SelectGroup>

          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">Models</SelectLabel>
            {models.map((m) => (
              <SelectItem key={`model:${m.model}`} value={`model:${m.model}`}>
                {m.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
