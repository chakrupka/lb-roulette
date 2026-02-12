def parse_errors():
    errors = []
    with open("progress.txt", "r") as f:
        lines = f.readlines()
        for line in lines[3:]:
            errors.append(line.split(" ")[3].split("\n")[0])

    with open("retries.txt", "w") as f:
        for title in errors:
            f.write(f"{title}\n")


parse_errors()
