import { scanDir } from "../utils/sidebar"
import dayjs from "dayjs"


type MeetingMinutesParsed = {
	date: Date
	fileNameWithoutDate: string
	fileName: string
	link: string
}

const stripFileExtension = (filename: string) => {
	return filename.split(".").slice(0, -1).join(".")
}

const parseFileName = (fileName: string, link: string): MeetingMinutesParsed => {
	const dateString = fileName.slice(0, 10)
	const date = new Date(dateString)

	return {
		date,
		fileNameWithoutDate: stripFileExtension(fileName.slice(10)),
		fileName: fileName,
		link: link
	}
}

export const getMeetingMinutesSidebar = () => {

	const items = scanDir("meetings").filter(v => {
		return v.filename != "index.md"
	})

	const groupedItems = items.reduce((acc, item) => {
		const parsed = parseFileName(item.filename, item.link)
		const year = parsed.date.getFullYear()
		if (!acc[year]) {
			acc[year] = []
		}
		acc[year].push(parsed)
		return acc
	}, {} as Record<number, MeetingMinutesParsed[]>)

	const groupedSidebarItems = Object.keys(groupedItems).map(v => {
		const items: MeetingMinutesParsed[] = groupedItems[v]
		return {
			text: v.toString(),
			items: items
				.sort((a, b) => {
					return a.date > b.date ? 1 : -1
				})
				.map(v => {
					return {
						text: `${dayjs(v.date).format("YYYY-MM-DD")} ${v.fileNameWithoutDate}`,
						link: v.link
					}
				})
		}
	})

	return groupedSidebarItems.sort((a, b) => {
		return b.text > a.text ? 1 : -1
	})

}
