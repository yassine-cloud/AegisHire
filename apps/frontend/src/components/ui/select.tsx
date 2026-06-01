import * as React from "react"
import { ChevronDown } from "lucide-react"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={`flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-50" />
    </div>
  )
)
Select.displayName = "Select"

const SelectTrigger = Select
const SelectValue = ({ placeholder }: { placeholder?: string }) => <>{placeholder}</>
const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
const SelectItem = (props: { value: string; children: React.ReactNode }) => (
  <option value={props.value}>{props.children}</option>
)
const SelectGroup = ({ children }: { children: React.ReactNode }) => <optgroup>{children}</optgroup>
const SelectSeparator = () => null
const SelectScrollUpButton = () => null
const SelectScrollDownButton = () => null

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
