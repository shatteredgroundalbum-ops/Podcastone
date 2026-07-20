import { useState, useEffect } from "react"
import { User, Mail, Key, Save, LogOut, Info, ExternalLink, Cpu, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getToken() {
  return localStorage.getItem("podcast_token") || ""
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user, logout, updateAccount } = useAuth()
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // API keys
  const [togetherKey, setTogetherKey] = useState("")
  const [openrouterKey, setOpenrouterKey] = useState("")
  const [showTogether, setShowTogether] = useState(false)
  const [showOpenrouter, setShowOpenrouter] = useState(false)
  const [keysSaving, setKeysSaving] = useState(false)
  const [keysLoaded, setKeysLoaded] = useState(false)
  const [keysSuccess, setKeysSuccess] = useState("")
  const [keysError, setKeysError] = useState("")

  useEffect(() => {
    if (open && !keysLoaded) {
      fetch("/api/keys", {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then((r) => r.json())
        .then((data) => {
          setTogetherKey(data.together_key || "")
          setOpenrouterKey(data.openrouter_key || "")
          setKeysLoaded(true)
        })
        .catch(() => {})
    }
  }, [open, keysLoaded])

  const handleSave = async () => {
    setError("")
    setSuccess("")
    if (!currentPassword) {
      setError("Current password is required")
      return
    }
    setSaving(true)
    try {
      await updateAccount(name, email, currentPassword, newPassword || undefined)
      setSuccess("Account updated successfully")
      setCurrentPassword("")
      setNewPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveKeys = async () => {
    setKeysError("")
    setKeysSuccess("")
    setKeysSaving(true)
    try {
      const res = await fetch("/api/keys", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          together_key: togetherKey,
          openrouter_key: openrouterKey,
        }),
      })
      if (!res.ok) throw new Error("Failed to save keys")
      setKeysSuccess("API keys saved")
    } catch (err) {
      setKeysError(err instanceof Error ? err.message : "Failed to save keys")
    } finally {
      setKeysSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="account" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="gap-2">
              <User className="h-4 w-4" /> Account
            </TabsTrigger>
            <TabsTrigger value="keys" className="gap-2">
              <Cpu className="h-4 w-4" /> API Keys
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2">
              <Info className="h-4 w-4" /> About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label htmlFor="current-password" className="text-xs text-muted-foreground">Current Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-password" className="text-xs text-muted-foreground">New Password <span className="text-muted-foreground/60">(optional)</span></Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" className="pl-9" />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={handleLogout} className="gap-2 ml-auto">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="keys" className="space-y-4 pt-4">
            <div className="text-xs text-muted-foreground mb-1">
              Enter your API keys for AI providers. Keys are stored securely and used only for your account.
            </div>

            <div className="space-y-1">
              <Label htmlFor="together-key" className="text-xs text-muted-foreground">Together.AI API Key</Label>
              <div className="relative">
                <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="together-key"
                  type={showTogether ? "text" : "password"}
                  value={togetherKey}
                  onChange={(e) => setTogetherKey(e.target.value)}
                  placeholder="tgp_v1_..."
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowTogether(!showTogether)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showTogether ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="openrouter-key" className="text-xs text-muted-foreground">OpenRouter API Key</Label>
              <div className="relative">
                <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="openrouter-key"
                  type={showOpenrouter ? "text" : "password"}
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenrouter(!showOpenrouter)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOpenrouter ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {keysError && <p className="text-sm text-destructive">{keysError}</p>}
            {keysSuccess && (
              <p className="text-sm text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> {keysSuccess}
              </p>
            )}

            <Button onClick={handleSaveKeys} disabled={keysSaving} className="gap-2 w-full">
              <Save className="h-4 w-4" /> {keysSaving ? "Saving..." : "Save API Keys"}
            </Button>
          </TabsContent>

          <TabsContent value="about" className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Podcast One</p>
                <p className="text-xs text-muted-foreground">AI-Powered Script Wizard</p>
              </div>
              <Badge variant="secondary" className="ml-auto">v1.0.0</Badge>
            </div>

            <Separator />

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Podcast One helps you create professional podcast scripts with AI assistance — from brainstorming to production-ready scripts.</p>
              <p>Powered by Together.AI and OpenRouter.</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>podcastone.workshop.build</span>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
