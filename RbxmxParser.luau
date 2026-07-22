--!strict
local RbxmxParser = {}

-- ==========================================
-- 1. BASE64 & XML DECODING UTILITIES
-- ==========================================

local B64_LOOKUP = {}
local B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

for i = 1, #B64_CHARS do
	B64_LOOKUP[string.sub(B64_CHARS, i, i)] = i - 1
end

local function base64Decode(data: string): string
	data = string.gsub(data, "[^A-Za-z0-9%+%/%=]", "")
	local output = {}
	local length = #data

	for i = 1, length, 4 do
		local c1 = B64_LOOKUP[string.sub(data, i, i)] or 0
		local c2 = B64_LOOKUP[string.sub(data, i + 1, i + 1)] or 0
		local c3 = B64_LOOKUP[string.sub(data, i + 2, i + 2)] or 0
		local c4 = B64_LOOKUP[string.sub(data, i + 3, i + 3)] or 0

		local b1 = bit32.or(bit32.lshift(c1, 2), bit32.rshift(c2, 4))
		local b2 = bit32.or(bit32.lshift(bit32.band(c2, 15), 4), bit32.rshift(c3, 2))
		local b3 = bit32.or(bit32.lshift(bit32.band(c3, 3), 6), c4)

		table.insert(output, string.char(b1))
		if string.sub(data, i + 2, i + 2) ~= "=" then
			table.insert(output, string.char(b2))
		end
		if string.sub(data, i + 3, i + 3) ~= "=" then
			table.insert(output, string.char(b3))
		end
	end

	return table.concat(output)
end

local XML_ENTITIES = {
	["&lt;"] = "<",
	["&gt;"] = ">",
	["&amp;"] = "&",
	["&quot;"] = '"',
	["&apos;"] = "'",
	["&#34;"] = '"',
	["&#39;"] = "'",
}

local function decodeXML(str: string): string
	local cdata = string.match(str, "^<!%[CDATA%[(.*)%]%]>$")
	if cdata then
		return cdata
	end
	return (string.gsub(str, "&%w+;", function(entity)
		return XML_ENTITIES[entity] or entity
	end))
end

local function getChildText(xmlChunk: string, tagName: string): string?
	return string.match(xmlChunk, "<" .. tagName .. ">(.-)</" .. tagName .. ">")
end

local function getNum(xmlChunk: string, tagName: string, default: number): number
	local txt = getChildText(xmlChunk, tagName)
	return txt and tonumber(txt) or default
end

-- ==========================================
-- 2. TYPE DESERIALIZERS
-- ==========================================

local TypeParsers = {}

TypeParsers["string"] = function(raw: string)
	return decodeXML(raw)
end

TypeParsers["ProtectedString"] = function(raw: string)
	return decodeXML(raw)
end

TypeParsers["BinaryString"] = function(raw: string)
	local clean = string.match(raw, "^%s*(.-)%s*$") or ""
	if clean == "" then return "" end
	return base64Decode(clean)
end

TypeParsers["SharedString"] = function(raw: string, sharedStrings: {[string]: string})
	local md5Key = string.match(raw, "^%s*(.-)%s*$")
	if md5Key and sharedStrings and sharedStrings[md5Key] then
		return sharedStrings[md5Key]
	end
	return ""
end

TypeParsers["bool"] = function(raw: string)
	return raw == "true" or raw == "1"
end

TypeParsers["int"] = function(raw: string)
	return tonumber(raw) or 0
end

TypeParsers["int64"] = TypeParsers["int"]
TypeParsers["float"] = TypeParsers["int"]
TypeParsers["double"] = TypeParsers["int"]

TypeParsers["token"] = function(raw: string)
	return tonumber(raw) or 0
end

TypeParsers["Vector2"] = function(raw: string)
	return Vector2.new(getNum(raw, "X", 0), getNum(raw, "Y", 0))
end

TypeParsers["Vector3"] = function(raw: string)
	return Vector3.new(getNum(raw, "X", 0), getNum(raw, "Y", 0), getNum(raw, "Z", 0))
end

TypeParsers["Vector2int16"] = TypeParsers["Vector2"]
TypeParsers["Vector3int16"] = TypeParsers["Vector3"]

TypeParsers["Color3"] = function(raw: string)
	local r = getNum(raw, "R", 0)
	local g = getNum(raw, "G", 0)
	local b = getNum(raw, "B", 0)
	return Color3.new(r, g, b)
end

TypeParsers["Color3uint8"] = function(raw: string)
	local packed = tonumber(raw)
	if packed then
		local b = bit32.band(packed, 0xFF)
		local g = bit32.band(bit32.rshift(packed, 8), 0xFF)
		local r = bit32.band(bit32.rshift(packed, 16), 0xFF)
		return Color3.fromRGB(r, g, b)
	end
	return Color3.new(0, 0, 0)
end

TypeParsers["UDim"] = function(raw: string)
	return UDim.new(getNum(raw, "S", 0), getNum(raw, "O", 0))
end

TypeParsers["UDim2"] = function(raw: string)
	return UDim2.new(
		getNum(raw, "XS", 0),
		getNum(raw, "XO", 0),
		getNum(raw, "YS", 0),
		getNum(raw, "YO", 0)
	)
end

TypeParsers["CFrame"] = function(raw: string)
	local x, y, z = getNum(raw, "X", 0), getNum(raw, "Y", 0), getNum(raw, "Z", 0)
	local r00 = getNum(raw, "R00", 1)
	local r01 = getNum(raw, "R01", 0)
	local r02 = getNum(raw, "R02", 0)
	local r10 = getNum(raw, "R10", 0)
	local r11 = getNum(raw, "R11", 1)
	local r12 = getNum(raw, "R12", 0)
	local r20 = getNum(raw, "R20", 0)
	local r21 = getNum(raw, "R21", 0)
	local r22 = getNum(raw, "R22", 1)

	return CFrame.new(x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22)
end

TypeParsers["CoordinateFrame"] = TypeParsers["CFrame"]

TypeParsers["NumberRange"] = function(raw: string)
	local min, max = string.match(raw, "^([%d%.%-%e]+)%s+([%d%.%-%e]+)$")
	if min and max then
		return NumberRange.new(tonumber(min) or 0, tonumber(max) or 0)
	end
	return NumberRange.new(0)
end

TypeParsers["NumberSequence"] = function(raw: string)
	local keypoints = {}
	for time, val, env in string.gmatch(raw, "([%d%.%-%e]+)%s+([%d%.%-%e]+)%s+([%d%.%-%e]+)") do
		table.insert(keypoints, NumberSequenceKeypoint.new(
			tonumber(time) or 0,
			tonumber(val) or 0,
			tonumber(env) or 0
		))
	end
	if #keypoints > 0 then
		return NumberSequence.new(keypoints)
	end
	return NumberSequence.new(0)
end

TypeParsers["ColorSequence"] = function(raw: string)
	local keypoints = {}
	for time, r, g, b, env in string.gmatch(raw, "([%d%.%-%e]+)%s+([%d%.%-%e]+)%s+([%d%.%-%e]+)%s+([%d%.%-%e]+)%s+([%d%.%-%e]+)") do
		table.insert(keypoints, ColorSequenceKeypoint.new(
			tonumber(time) or 0,
			Color3.new(tonumber(r) or 0, tonumber(g) or 0, tonumber(b) or 0)
		))
	end
	if #keypoints > 0 then
		return ColorSequence.new(keypoints)
	end
	return ColorSequence.new(Color3.new(1, 1, 1))
end

TypeParsers["PhysicalProperties"] = function(raw: string)
	local hasCustom = getChildText(raw, "CustomPhysics")
	if hasCustom == "true" or hasCustom == "1" then
		local density = getNum(raw, "Density", 0.7)
		local friction = getNum(raw, "Friction", 0.3)
		local elasticity = getNum(raw, "Elasticity", 0.5)
		local frictionWeight = getNum(raw, "FrictionWeight", 1)
		local elasticityWeight = getNum(raw, "ElasticityWeight", 1)
		return PhysicalProperties.new(density, friction, elasticity, frictionWeight, elasticityWeight)
	end
	return nil
end

TypeParsers["Content"] = function(raw: string)
	local url = getChildText(raw, "url") or getChildText(raw, "uri")
	return url and decodeXML(url) or ""
end

-- ==========================================
-- 3. PRE-PASS: SHARED STRINGS PARSER
-- ==========================================

local function parseSharedStringBlock(xmlContent: string): {[string]: string}
	local sharedStrings = {}
	local block = string.match(xmlContent, "<SharedStrings>(.-)</SharedStrings>")
	if block then
		for md5, base64Val in string.gmatch(block, '<SharedString md5="([^"]+)">(.-)</SharedString>') do
			sharedStrings[md5] = base64Decode(decodeXML(base64Val))
		end
	end
	return sharedStrings
end

-- ==========================================
-- 4. MAIN PARSER IMPLEMENTATION
-- ==========================================

export type ParseOptions = {
	YieldInterval: number?, -- Operations before task.wait()
	ParentTo: Instance?,    -- Parent container
}

function RbxmxParser.Decode(xmlString: string, options: ParseOptions?): Model
	local opts = options or {}
	local yieldInterval = opts.YieldInterval or 400
	local parentTo = opts.ParentTo

	-- Pre-pass: Extract deduplicated SharedStrings
	local sharedStrings = parseSharedStringBlock(xmlString)

	local referents = {}
	local deferredRefs = {}
	local parentStack = {}
	local rootInstances = {}

	local opCounter = 0
	local function tickOp()
		opCounter += 1
		if opCounter % yieldInterval == 0 then
			task.wait()
		end
	end

	local cursor = 1
	local strLen = #xmlString

	-- Pass 1: Parse Structure and Instantiation
	while cursor <= strLen do
		local tagStart, tagEnd, tagContent = string.find(xmlString, "<([^>]+)>", cursor)
		if not tagStart then break end
		cursor = tagEnd + 1

		tickOp()

		-- Ignore Comments, Directives, and SharedStrings container
		if string.sub(tagContent, 1, 1) == "?" or string.sub(tagContent, 1, 3) == "!--" or string.sub(tagContent, 1, 13) == "SharedStrings" or string.sub(tagContent, 1, 14) == "/SharedStrings" then
			continue
		end

		-- Parse <Item class="ClassName" referent="RBX...">
		if string.sub(tagContent, 1, 4) == "Item" then
			local className = string.match(tagContent, 'class="([^"]+)"')
			local refId = string.match(tagContent, 'referent="([^"]+)"')

			local instance
			local ok = pcall(function()
				instance = Instance.new(className)
			end)

			if not ok or not instance then
				-- Convert PartOperations/Unions or uncreatable classes to Parts/Folders
				if className == "PartOperation" or className == "UnionOperation" then
					instance = Instance.new("Part")
					instance.Name = "UnionOperation"
				else
					instance = Instance.new("Folder")
					instance.Name = "[" .. tostring(className) .. "]"
				end
			end

			if refId then
				referents[refId] = instance
			end

			local currentParent = parentStack[#parentStack]
			if currentParent then
				instance.Parent = currentParent
			else
				table.insert(rootInstances, instance)
			end

			table.insert(parentStack, instance)

		-- Parse </Item>
		elseif tagContent == "/Item" then
			table.remove(parentStack)

		-- Parse Property Nodes
		elseif string.sub(tagContent, 1, 11) ~= "/Properties" and string.sub(tagContent, 1, 10) ~= "Properties" then
			local tagType, propName = string.match(tagContent, "^(%w+)%s+name=\"([^\"]+)\"")

			if tagType and propName then
				local currentInstance = parentStack[#parentStack]

				if currentInstance then
					if tagType == "Ref" then
						local refCloseStart, refCloseEnd = string.find(xmlString, "</Ref>", cursor)
						if refCloseStart then
							local refValue = string.sub(xmlString, cursor, refCloseStart - 1)
							cursor = refCloseEnd + 1

							if refValue ~= "null" and refValue ~= "" then
								table.insert(deferredRefs, {
									Instance = currentInstance,
									Property = propName,
									TargetRef = refValue
								})
							end
						end
					else
						local closeTag = "</" .. tagType .. ">"
						local valStart, valEnd = string.find(xmlString, closeTag, cursor, true)

						if valStart then
							local rawVal = string.sub(xmlString, cursor, valStart - 1)
							cursor = valEnd + 1

							local parser = TypeParsers[tagType]
							if parser then
								local parsedVal = parser(rawVal, sharedStrings)
								if parsedVal ~= nil then
									pcall(function()
										(currentInstance :: any)[propName] = parsedVal
									end)
								end
							end
						end
					end
				end
			end
		end
	end

	-- Pass 2: Resolve Instance References (<Ref>)
	for _, refData in deferredRefs do
		tickOp()
		local targetInstance = referents[refData.TargetRef]
		if targetInstance then
			pcall(function()
				(refData.Instance :: any)[refData.Property] = targetInstance
			end)
		end
	end

	-- Group output in a Model
	local container = Instance.new("Model")
	container.Name = "ImportedModel"

	for _, rootObj in rootInstances do
		rootObj.Parent = container
	end

	if parentTo then
		container.Parent = parentTo
	end

	return container
end

return RbxmxParser
