import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"

const categories = [
	"All",
	"Music",
	"Movies",
	"Gaming",
	"News",
	"Sports",
	"Technology",
	"Comedy",
	"Education",
	"Travel",
	"Food",
	"Fashion",
] as const

export type Category = (typeof categories)[number]

type CategoryTabProps = {
	value?: Category
	onChange?: (category: Category) => void
}

export default function CategoryTab({ value, onChange }: CategoryTabProps) {
	const [uncontrolledValue, setUncontrolledValue] = useState<Category>("All")
	const activeCategory = useMemo(() => value ?? uncontrolledValue, [value, uncontrolledValue])

	const setActiveCategory = (category: Category) => {
		setUncontrolledValue(category)
		onChange?.(category)
	}

	return (
		<div className="flex gap-2 overflow-x-auto pb-2">
			{categories.map((category) => {
				const isActive = activeCategory === category

				return (
					<Button
						key={category}
						type="button"
						variant={isActive ? "default" : "secondary"}
						size="sm"
						className="rounded-full whitespace-nowrap"
						aria-pressed={isActive}
						onClick={() => setActiveCategory(category)}
					>
						{category}
					</Button>
				)
			})}
		</div>
	)
}
