import { useState } from 'react'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  ConfirmDialog,
  ConfirmDialogTrigger,
  ConfirmDialogContent,
  ConfirmDialogHeader,
  ConfirmDialogFooter,
  ConfirmDialogTitle,
  ConfirmDialogDescription,
  ConfirmDialogAction,
  ConfirmDialogCancel,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  FormField,
  Input,
  Progress,
  ScrollArea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
} from '@/components/ui'
import {
  User,
  Settings,
  LogOut,
  MoreHorizontal,
  Mail,
  Plus,
  Trash2,
  ChevronRight,
} from 'lucide-react'

function App() {
  const [progress, setProgress] = useState(65)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
            <Badge variant="secondary">Component Library</Badge>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar size="sm">
                    <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Tabs defaultValue="buttons" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="buttons">Buttons</TabsTrigger>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="overlays">Overlays</TabsTrigger>
          </TabsList>

          {/* Buttons Tab */}
          <TabsContent value="buttons">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Button Variants</CardTitle>
                  <CardDescription>
                    Different button styles for various use cases
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Button Sizes</CardTitle>
                  <CardDescription>
                    Buttons come in small, medium, and large sizes
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">
                    <Plus className="size-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Badge Variants</CardTitle>
                  <CardDescription>
                    Status indicators and labels
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Avatar Sizes</CardTitle>
                  <CardDescription>
                    User avatars with fallback support
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <Avatar size="sm">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <Avatar size="md">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>MD</AvatarFallback>
                  </Avatar>
                  <Avatar size="lg">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>LG</AvatarFallback>
                  </Avatar>
                  <Avatar size="xl">
                    <AvatarFallback>XL</AvatarFallback>
                  </Avatar>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inputs Tab */}
          <TabsContent value="inputs">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Form Inputs</CardTitle>
                  <CardDescription>
                    Text inputs with labels and validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField label="Email" htmlFor="email" required>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                    />
                  </FormField>
                  <FormField
                    label="Password"
                    htmlFor="password"
                    description="Must be at least 8 characters"
                  >
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                    />
                  </FormField>
                  <FormField
                    label="Username"
                    htmlFor="username"
                    error="This username is already taken"
                  >
                    <Input id="username" placeholder="Enter username" error />
                  </FormField>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Select &amp; Textarea</CardTitle>
                  <CardDescription>
                    Dropdown selects and multi-line text
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField label="Role" htmlFor="role">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Bio" htmlFor="bio">
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </FormField>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Input Variants</CardTitle>
                  <CardDescription>
                    Default and ghost input styles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField label="Default Input">
                    <Input placeholder="Default style" />
                  </FormField>
                  <FormField label="Ghost Input">
                    <Input variant="ghost" placeholder="Ghost style" />
                  </FormField>
                  <FormField label="Small Input">
                    <Input inputSize="sm" placeholder="Small size" />
                  </FormField>
                  <FormField label="Large Input">
                    <Input inputSize="lg" placeholder="Large size" />
                  </FormField>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scroll Area</CardTitle>
                  <CardDescription>
                    Scrollable container with custom scrollbar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48 w-full rounded-md border border-border p-4">
                    <div className="space-y-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg bg-muted p-3"
                        >
                          <Avatar size="sm">
                            <AvatarFallback>U{i + 1}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">User {i + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              user{i + 1}@example.com
                            </p>
                          </div>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Progress Indicator</CardTitle>
                  <CardDescription>
                    Visual progress feedback
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Upload Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProgress(Math.max(0, progress - 10))}
                    >
                      -10%
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProgress(Math.min(100, progress + 10))}
                    >
                      +10%
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Loading Spinners</CardTitle>
                  <CardDescription>
                    Spinner sizes for different contexts
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <Spinner size="sm" />
                    <span className="text-xs text-muted-foreground">Small</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Spinner size="md" />
                    <span className="text-xs text-muted-foreground">Medium</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Spinner size="lg" />
                    <span className="text-xs text-muted-foreground">Large</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Spinner size="xl" />
                    <span className="text-xs text-muted-foreground">XL</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Separator</CardTitle>
                  <CardDescription>
                    Visual dividers for content sections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Section 1</span>
                      <Separator className="flex-1" />
                      <span className="text-sm font-medium">Section 2</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 rounded-lg bg-muted p-4">
                        <p className="text-sm">Left content</p>
                      </div>
                      <Separator orientation="vertical" className="h-16" />
                      <div className="flex-1 rounded-lg bg-muted p-4">
                        <p className="text-sm">Right content</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Overlays Tab */}
          <TabsContent value="overlays">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Dialog</CardTitle>
                  <CardDescription>
                    Modal dialogs for focused interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Mail className="mr-2 size-4" />
                        Open Dialog
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Invitation</DialogTitle>
                        <DialogDescription>
                          Send an email invitation to a new team member.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <FormField label="Email Address" htmlFor="invite-email">
                          <Input
                            id="invite-email"
                            placeholder="colleague@company.com"
                          />
                        </FormField>
                        <FormField label="Role">
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button>Send Invitation</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Confirm Dialog</CardTitle>
                  <CardDescription>
                    Confirmation for destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConfirmDialog>
                    <ConfirmDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 size-4" />
                        Delete Account
                      </Button>
                    </ConfirmDialogTrigger>
                    <ConfirmDialogContent>
                      <ConfirmDialogHeader>
                        <ConfirmDialogTitle>Are you sure?</ConfirmDialogTitle>
                        <ConfirmDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your account and remove all associated data.
                        </ConfirmDialogDescription>
                      </ConfirmDialogHeader>
                      <ConfirmDialogFooter>
                        <ConfirmDialogCancel>Cancel</ConfirmDialogCancel>
                        <ConfirmDialogAction>Delete</ConfirmDialogAction>
                      </ConfirmDialogFooter>
                    </ConfirmDialogContent>
                  </ConfirmDialog>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sheet (Drawer)</CardTitle>
                  <CardDescription>
                    Slide-in panel from the side
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline">
                        Open Settings
                        <ChevronRight className="ml-2 size-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Settings</SheetTitle>
                        <SheetDescription>
                          Configure your account settings and preferences.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-6 py-6">
                        <FormField label="Display Name">
                          <Input placeholder="Your name" />
                        </FormField>
                        <FormField label="Email">
                          <Input type="email" placeholder="your@email.com" />
                        </FormField>
                        <FormField label="Timezone">
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="utc">UTC</SelectItem>
                              <SelectItem value="pst">Pacific Time</SelectItem>
                              <SelectItem value="est">Eastern Time</SelectItem>
                              <SelectItem value="cet">
                                Central European
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <Separator />
                        <Button className="w-full">Save Changes</Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dropdown Menu</CardTitle>
                  <CardDescription>
                    Context menus and action menus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <MoreHorizontal className="mr-2 size-4" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <User className="mr-2 size-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="mr-2 size-4" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 size-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-muted-foreground">
            Admin Dashboard Component Library &bull; Built with React + Vite + Tailwind
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
