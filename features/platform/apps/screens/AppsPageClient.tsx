'use client'

import React, { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createOpenshipOAuthApp } from "../actions"
import { toast } from "sonner"

// Available apps that can be activated
const AVAILABLE_APPS = [
  {
    id: 'openship-shop',
    title: 'Openship Shop',
    description: 'Connect to Openship to manage your orders and sync products from connected shops.',
    type: 'shop' as const
  },
  {
    id: 'openship-channel', 
    title: 'Openship Channel',
    description: 'Allow Openship to use this store as a fulfillment channel for order processing.',
    type: 'channel' as const
  }
]


interface AvailableApp {
  id: string
  title: string
  description: string
  type: 'shop' | 'channel'
}

interface ExistingApp {
  id: string
  name: string
  description?: string
  clientId: string
  clientSecret: string
  redirectUris: string[]
  scopes: string[]
  status: 'active' | 'inactive'
  metadata?: Record<string, any>
}

interface AppsPageClientProps {
  existingApps: ExistingApp[]
}

interface AvailableAppCardProps {
  app: AvailableApp
  isActivated: boolean
  onActivate: () => void
}

const AvailableAppCard = ({ app, isActivated, onActivate }: AvailableAppCardProps) => {
  return (
    <Card className="p-6">
      <div className="relative">
        <div className="space-y-2 py-6">
          <h3 className="text-base font-medium">{app.title}</h3>
          <p className="text-muted-foreground line-clamp-2 text-sm">{app.description}</p>
        </div>

        <div className="flex gap-3 border-t border-dashed pt-6">
          <Button 
            variant="secondary" 
            size="sm" 
            className="gap-1 pr-2 shadow-none"
            onClick={onActivate}
            disabled={isActivated}
          >
            {isActivated ? 'Activated' : 'Activate'}
            {!isActivated && <ChevronRight className="ml-0 !size-3.5 opacity-50" />}
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface ExistingAppCardProps {
  app: ExistingApp
  onInstall: () => void
}

const ExistingAppCard = ({ app, onInstall }: ExistingAppCardProps) => {
  return (
    <Card className="p-6">
      <div className="relative">
        <div className="space-y-2 py-6">
          <h3 className="text-base font-medium">{app.name}</h3>
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {app.description || 'OAuth application for Openship integration'}
          </p>
        </div>

        <div className="flex gap-3 border-t border-dashed pt-6">
          <Button 
            variant="secondary" 
            size="sm" 
            className="gap-1 pr-2 shadow-none"
            onClick={onInstall}
          >
            Install
            <ChevronRight className="ml-0 !size-3.5 opacity-50" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function AppsPageClient({ existingApps = [] }: AppsPageClientProps) {
  const [activatedApps, setActivatedApps] = useState<string[]>([])
  const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<AvailableApp | null>(null)
  const [openshipUrl, setOpenshipUrl] = useState('')
  const [isCreatingApp, setIsCreatingApp] = useState(false)
  

  const handleActivate = useCallback((appId: string) => {
    const app = AVAILABLE_APPS.find(a => a.id === appId)
    if (app) {
      setSelectedApp(app)
      setOpenshipUrl('')
      setIsActivationDialogOpen(true)
    }
  }, [])

  const handleCreateApp = useCallback(async () => {
    if (!selectedApp || !openshipUrl.trim()) {
      return
    }

    setIsCreatingApp(true)
    
    try {
      const result = await createOpenshipOAuthApp({
        appType: selectedApp.id as 'openship-shop' | 'openship-channel',
        openshipUrl: openshipUrl.trim()
      })

      if (result.success) {
        toast.success(`${selectedApp.title} OAuth app created successfully!`)
        
        // Mark as activated
        setActivatedApps(prev => [...prev, selectedApp.id])
        
        // Close dialog
        setIsActivationDialogOpen(false)
        setSelectedApp(null)
        setOpenshipUrl('')
      } else {
        toast.error(result.error || 'Failed to create OAuth app')
      }
      
    } catch (error) {
      console.error('Failed to create OAuth app:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsCreatingApp(false)
    }
  }, [selectedApp, openshipUrl])

  const handleInstall = useCallback((app: ExistingApp) => {
    console.log('🔴 INSTALL BUTTON CLICKED - handleInstall called with app:', app);
    
    // Check if app has redirect URI configured
    if (!app.redirectUris || app.redirectUris.length === 0) {
      console.log('🔴 ERROR: No redirect URIs found for app');
      toast.error('No redirect URI configured for this app')
      return
    }

    console.log('🔴 App redirect URIs:', app.redirectUris);

    // Build OAuth state (marketplace flow)
    const state = JSON.stringify({
      type: 'marketplace',
      client_id: app.clientId,
      client_secret: app.clientSecret,
      app_name: app.name,
      adapter_slug: 'openfront', // Identifies which adapter to use for platform creation
      nonce: crypto.randomUUID()
    })

    // Set URL parameters to show OAuth install dialog (same as when coming from Openship)
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('install', 'true')
    currentUrl.searchParams.set('client_id', app.clientId)
    currentUrl.searchParams.set('scope', app.scopes.join(' '))
    currentUrl.searchParams.set('redirect_uri', app.redirectUris[0])
    currentUrl.searchParams.set('response_type', 'code')
    currentUrl.searchParams.set('state', state)

    console.log('🔴 Setting URL params to show OAuth dialog:', currentUrl.toString())
    
    window.history.pushState({}, '', currentUrl.toString())
    
    // Force page refresh to show dialog
    window.location.reload()
  }, [])



  return (
    <div className="px-4 md:px-6 pb-6">
      {/* Available Apps Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4">Available Apps</h2>
        <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
          {AVAILABLE_APPS.map((app) => (
            <AvailableAppCard
              key={app.id}
              app={app}
              isActivated={activatedApps.includes(app.id)}
              onActivate={() => handleActivate(app.id)}
            />
          ))}
        </div>
      </div>

      {/* Existing Apps Section */}
      <div>
        <h2 className="text-lg font-medium mb-4">Existing Apps</h2>
        {existingApps.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No existing OAuth apps found. Activate a recommended app above to get started.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {existingApps.map((app) => (
              <ExistingAppCard
                key={app.id}
                app={app}
                onInstall={() => handleInstall(app)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Activation Dialog */}
      <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate {selectedApp?.title}</DialogTitle>
            <DialogDescription>
              Enter your Openship URL to create the OAuth application.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="openship-url">Openship URL</Label>
              <Input
                id="openship-url"
                value={openshipUrl}
                onChange={(e) => setOpenshipUrl(e.target.value)}
                placeholder="https://openship.mydomain.com"
                disabled={isCreatingApp}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the full URL where your Openship instance is hosted
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActivationDialogOpen(false)}
              disabled={isCreatingApp}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateApp}
              disabled={!openshipUrl.trim() || isCreatingApp}
            >
              {isCreatingApp ? 'Creating...' : 'Create App'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}